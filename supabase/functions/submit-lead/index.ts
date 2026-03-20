import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadSubmission {
  email: string;
  calculation_details?: {
    kaufpreisAlt: number;
    marktwert: number;
    yearlySavings: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, calculation_details }: LeadSubmission = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabase
      .from("email_leads")
      .insert({
        email: email.toLowerCase().trim(),
        calculation_details: calculation_details || null,
      })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Email already registered" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "CAPRI CONSULT",
          email: "kontakt@capri-consult.de",
        },
        to: [{ email: email }],
        subject: "Ihre Ehegattenschaukel-Berechnung",
        htmlContent: `
          <h2>Vielen Dank für Ihr Interesse!</h2>
          <p>Sie haben den Ehegattenschaukel-Rechner von CAPRI CONSULT verwendet.</p>
          ${calculation_details ? `
            <h3>Ihre Berechnung:</h3>
            <ul>
              <li>Ursprünglicher Kaufpreis: ${calculation_details.kaufpreisAlt.toLocaleString('de-DE')} €</li>
              <li>Aktueller Marktwert: ${calculation_details.marktwert.toLocaleString('de-DE')} €</li>
              <li>Jährliche Steuerersparnis: ${calculation_details.yearlySavings.toLocaleString('de-DE')} €</li>
            </ul>
          ` : ''}
          <p>Möchten Sie mehr über die Umsetzung erfahren? Vereinbaren Sie ein kostenloses Beratungsgespräch:</p>
          <p><a href="https://www.capri-consult.de/kontakt/" style="background-color: #1c1e65; color: white; padding: 12px 24px; text-decoration: none; display: inline-block;">Jetzt Beratungsgespräch vereinbaren</a></p>
          <p>Mit freundlichen Grüßen,<br>Ihr CAPRI CONSULT Team</p>
          <p style="font-size: 12px; color: #666;">CAPRI CONSULT<br>kontakt@capri-consult.de</p>
        `,
      }),
    });

    const zapierPayload = {
      email: email,
      timestamp: new Date().toISOString(),
      calculation_details: calculation_details || null,
    };

    await fetch("https://hooks.zapier.com/hooks/catch/12534846/upk68yz/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zapierPayload),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing lead:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
