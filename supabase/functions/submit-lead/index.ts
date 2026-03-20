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
    afaAlt: number;
    afaNeu: number;
    zinskosten: number;
    gesamtAbsetzbarAlt: number;
    gesamtAbsetzbarNeu: number;
    steuerAlt: number;
    steuerNeu: number;
    cumulativeSavings: number[];
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

    const formatEUR = (value: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    };

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
        subject: "Deine Ehegattenschaukel-Berechnung",
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Effra:wght@400;700&display=swap');
              body { font-family: 'Effra', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background-color: #1c1e65; color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #ffffff; }
              .highlight-box { background-color: #94fab7; color: #1c1e65; padding: 30px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .highlight-box h3 { font-size: 32px; margin: 10px 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; border: 2px solid #1c1e65; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
              th { background-color: #1c1e65; color: white; text-align: center; font-weight: bold; }
              td:first-child { font-weight: bold; color: #1c1e65; }
              td:nth-child(2), td:nth-child(3) { text-align: center; }
              .savings-table td:nth-child(2) { color: #1c1e65; }
              .savings-table td:nth-child(3) { color: #1c1e65; font-weight: bold; }
              .chart-data { background-color: #ffffff; padding: 20px; margin: 20px 0; border: 2px solid #1c1e65; border-radius: 8px; }
              .chart-data h4 { color: #1c1e65; margin-bottom: 15px; font-weight: bold; }
              .chart-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
              .chart-row:last-child { border-bottom: none; }
              .chart-row span:last-child { font-weight: bold; color: #1c1e65; }
              .cta-button { background-color: #94fab7; color: #1c1e65; padding: 15px 30px; text-decoration: none; display: inline-block; font-weight: bold; margin: 20px 0; border-radius: 4px; }
              .footer { background-color: #1c1e65; color: white; padding: 30px; text-align: center; margin-top: 30px; }
              .total-box { background-color: #1c1e65; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .total-box h4 { font-size: 28px; margin: 10px 0; font-weight: bold; }
              .input-data { background-color: #ffffff; border: 2px solid #1c1e65; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .input-data h3 { color: #1c1e65; margin-bottom: 15px; }
              .input-data ul { list-style: none; padding: 0; }
              .input-data li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
              .input-data li:last-child { border-bottom: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Deine Ehegattenschaukel-Berechnung</h1>
                <p>Eine Auswertung von CAPRI CONSULT</p>
              </div>

              <div class="content">
                <h2>Vielen Dank für dein Interesse!</h2>
                <p>Du hast den Ehegattenschaukel-Rechner von CAPRI CONSULT verwendet. Hier sind deine vollständigen Ergebnisse:</p>

                ${calculation_details ? `
                  <div class="highlight-box">
                    <p style="font-size: 18px; margin: 0;">Deine jährliche Steuerersparnis</p>
                    <h3>${formatEUR(calculation_details.yearlySavings)}</h3>
                    <small>pro Jahr</small>
                  </div>

                  <h3>📋 Detaillierte Vergleichstabelle</h3>
                  <table class="savings-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Vorher</th>
                        <th>Nachher</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>AfA (Abschreibung)</td>
                        <td>${formatEUR(calculation_details.afaAlt)}</td>
                        <td>${formatEUR(calculation_details.afaNeu)}</td>
                      </tr>
                      <tr>
                        <td>Zinsaufwendungen</td>
                        <td>0 €</td>
                        <td>${formatEUR(calculation_details.zinskosten)}</td>
                      </tr>
                      <tr>
                        <td>Gesamt absetzbar</td>
                        <td>${formatEUR(calculation_details.gesamtAbsetzbarAlt)}</td>
                        <td>${formatEUR(calculation_details.gesamtAbsetzbarNeu)}</td>
                      </tr>
                      <tr>
                        <td>Steuerersparnis (jährlich)</td>
                        <td>${formatEUR(calculation_details.steuerAlt)}</td>
                        <td>${formatEUR(calculation_details.steuerNeu)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="input-data">
                    <h3>🏠 Deine Eingabedaten</h3>
                    <ul>
                      <li><strong>Ursprünglicher Kaufpreis:</strong> ${formatEUR(calculation_details.kaufpreisAlt)}</li>
                      <li><strong>Aktueller Marktwert:</strong> ${formatEUR(calculation_details.marktwert)}</li>
                    </ul>
                  </div>

                  <div class="chart-data">
                    <h4>📊 10-Jahres-Vorschau: Kumulierte Steuerersparnis</h4>
                    ${calculation_details.cumulativeSavings.map((savings, index) => `
                      <div class="chart-row">
                        <span><strong>Jahr ${index + 1}:</strong></span>
                        <span>${formatEUR(savings)}</span>
                      </div>
                    `).join('')}
                  </div>

                  <div class="total-box">
                    <p style="font-size: 18px; margin: 0;">Gesamtersparnis nach 10 Jahren</p>
                    <h4>${formatEUR(calculation_details.cumulativeSavings[9])}</h4>
                  </div>
                ` : ''}

                <h3>💡 Möchtest du diese Steuerersparnis nutzen?</h3>
                <p>Unsere Experten von CAPRI CONSULT unterstützen dich bei der rechtssicheren Umsetzung der Ehegattenschaukel und vielen weiteren Steuertricks.</p>

                <a href="https://www.capri-consult.de/kontakt/" class="cta-button">Jetzt kostenfreie Erstberatung vereinbaren</a>
              </div>

              <div class="footer">
                <p><strong>CAPRI CONSULT</strong></p>
                <p>kontakt@capri-consult.de</p>
                <p style="font-size: 12px; margin-top: 20px;">Diese E-Mail wurde automatisch generiert, weil du den Ehegattenschaukel-Rechner verwendet hast.</p>
              </div>
            </div>
          </body>
          </html>
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
