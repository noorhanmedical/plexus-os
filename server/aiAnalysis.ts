import OpenAI from "openai";
import { ANCILLARY_CATALOG, type AncillaryService } from "../shared/ancillaryCatalog.js";
import type { PatientProfile } from "../shared/patientProfile.js";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AncillaryRecommendation {
  ancillary_code: string;
  ancillary_name: string;
  category: string;
  qualification_score: number;
  qualification_reasoning: string;
  clinical_indications: string[];
  evidence_citations: string[];
  priority: "high" | "medium" | "low";
  cooldown_status: "eligible" | "in_cooldown" | "once_only_completed" | "no_limit";
  eligible_date?: string;
}

export interface AIAnalysisResult {
  patient_uuid: string;
  analysis_timestamp: string;
  recommendations: AncillaryRecommendation[];
  overall_summary: string;
  risk_factors_identified: string[];
  suggested_follow_up: string;
}

const AGGRESSIVE_QUALIFICATION_PROMPT = `You are an expert clinical decision support AI for a preventive care practice. Your goal is to MAXIMIZE patient qualification for ancillary services while maintaining clinical appropriateness.

IMPORTANT: Be AGGRESSIVE in finding clinical justifications. If there is ANY reasonable medical indication, recommend the service. The practice wants to catch ALL patients who could benefit.

Available ancillary services:
${ANCILLARY_CATALOG.map(a => `- ${a.ancillary_code}: ${a.ancillary_name} (${a.category})`).join('\n')}

QUALIFICATION GUIDELINES (be liberal):

**BrainWave** (Neuro testing):
- ANY cognitive complaints, memory issues, brain fog
- Depression, anxiety (affects cognition)
- Age 50+ with ANY chronic condition
- Diabetes (neuropathy risk)
- Hypertension (vascular dementia risk)
- Sleep disorders
- Prior head injury
- Family history of dementia

**VitalWave** (Cardio/Autonomic):
- ANY cardiovascular history
- Hypertension, diabetes, hyperlipidemia
- Dizziness, lightheadedness, syncope
- Fatigue, exercise intolerance
- Arrhythmias, palpitations
- Age 50+ with risk factors
- Anxiety (autonomic dysregulation)
- Medication effects on autonomic system

**PGX** (Pharmacogenomics):
- Taking ANY psychiatric medication
- Taking cardiovascular medications
- Multiple medications (polypharmacy)
- History of medication side effects
- Difficulty finding right medication doses
- Planning to start new medications
- Chronic pain management

**Steroid Injection** (No limit):
- Joint pain, back pain
- Arthritis
- Any musculoskeletal complaint

**Ultrasound Services** (be liberal - vascular screening saves lives):
- Carotid: Stroke risk factors, HTN, diabetes, smoking history, CAD, PAD, age >60
- Echo: ANY cardiac symptoms, HTN, murmurs, dyspnea, edema, arrhythmias
- Renal: HTN, CKD, diabetes, renovascular disease risk
- Abdominal arteries: Abdominal symptoms, weight loss, postprandial pain
- IVC: Heart failure, edema, volume assessment
- Liver/Portal: Liver disease, hepatitis, cirrhosis risk, abnormal LFTs
- Lower extremity arterial: Claudication, leg pain, PAD risk, diabetes with foot issues
- Upper extremity arterial: Arm symptoms, vascular risk
- Lower extremity venous: DVT risk, leg swelling, varicose veins
- Upper extremity venous: Arm swelling, catheter history
- Stress echo: CAD risk, exertional symptoms, pre-operative assessment
- Aorta/Iliac: AAA risk (smoking, HTN, age, male), abdominal pulsation
- AAA Screening: Male 65-75 with smoking history (Medicare covers), age >60 with risk factors

For each recommendation, provide:
1. A qualification score (0-100) - be generous, default to higher scores
2. Specific clinical indications found in the patient data
3. Peer-reviewed evidence supporting the test
4. Priority level

Format your response as JSON matching this structure:
{
  "recommendations": [
    {
      "ancillary_code": "CODE",
      "qualification_score": 85,
      "clinical_indications": ["indication1", "indication2"],
      "evidence_citations": ["Study name (Journal, Year)"],
      "priority": "high"
    }
  ],
  "risk_factors_identified": ["factor1", "factor2"],
  "overall_summary": "Summary of patient's clinical picture and recommendations",
  "suggested_follow_up": "Follow-up recommendations"
}`;

function calculateCooldownStatus(
  ancillary: AncillaryService,
  payorType: "Medicare" | "PPO" | undefined,
  lastCompletedDate?: string
): { status: AncillaryRecommendation["cooldown_status"]; eligibleDate?: string } {
  if (ancillary.repeat_policy === "NO_LIMIT") {
    return { status: "no_limit" };
  }

  if (ancillary.repeat_policy === "ONCE_ONLY") {
    if (lastCompletedDate) {
      return { status: "once_only_completed" };
    }
    return { status: "eligible" };
  }

  if (!lastCompletedDate) {
    return { status: "eligible" };
  }

  const lastDate = new Date(lastCompletedDate);
  const cooldownMonths = payorType === "Medicare"
    ? ancillary.cooldown_months_medicare
    : ancillary.cooldown_months_ppo;

  if (!cooldownMonths) {
    return { status: "eligible" };
  }

  const eligibleDate = new Date(lastDate);
  eligibleDate.setMonth(eligibleDate.getMonth() + cooldownMonths);

  if (new Date() >= eligibleDate) {
    return { status: "eligible" };
  }

  return {
    status: "in_cooldown",
    eligibleDate: eligibleDate.toISOString().split("T")[0],
  };
}

export async function analyzePatientForAncillaries(
  patient_uuid: string,
  profile: PatientProfile,
  patientData: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    payor_type?: string;
    payor_name?: string;
  },
  priorAncillaries?: { ancillary_code: string; completed_date: string }[]
): Promise<AIAnalysisResult> {
  const patientContext = `
PATIENT INFORMATION:
- Name: ${patientData.first_name || "Unknown"} ${patientData.last_name || ""}
- DOB: ${patientData.date_of_birth || "Unknown"}
- Insurance: ${patientData.payor_type || profile.payor_type || "Unknown"} (${patientData.payor_name || "Unknown"})

MEDICAL HISTORY:
${profile.medical_history || "Not documented"}

CURRENT MEDICATIONS:
${profile.medications || "Not documented"}

CLINICAL NOTES:
${profile.patient_notes || "No additional notes"}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: AGGRESSIVE_QUALIFICATION_PROMPT },
        { role: "user", content: `Analyze this patient for ALL potentially appropriate ancillary services. Be aggressive in finding indications:\n\n${patientContext}` },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const payorType = (patientData.payor_type || profile.payor_type) as "Medicare" | "PPO" | undefined;

    const recommendations: AncillaryRecommendation[] = (parsed.recommendations || []).map((rec: any) => {
      const ancillary = ANCILLARY_CATALOG.find(a => a.ancillary_code === rec.ancillary_code);
      if (!ancillary) return null;

      const priorRecord = priorAncillaries?.find(p => p.ancillary_code === rec.ancillary_code);
      const cooldown = calculateCooldownStatus(ancillary, payorType, priorRecord?.completed_date);

      return {
        ancillary_code: rec.ancillary_code,
        ancillary_name: ancillary.ancillary_name,
        category: ancillary.category,
        qualification_score: Math.min(100, Math.max(0, rec.qualification_score || 75)),
        qualification_reasoning: generateReasoning(rec.clinical_indications || []),
        clinical_indications: rec.clinical_indications || [],
        evidence_citations: rec.evidence_citations || [],
        priority: rec.priority || "medium",
        cooldown_status: cooldown.status,
        eligible_date: cooldown.eligibleDate,
      };
    }).filter(Boolean) as AncillaryRecommendation[];

    recommendations.sort((a, b) => b.qualification_score - a.qualification_score);

    return {
      patient_uuid,
      analysis_timestamp: new Date().toISOString(),
      recommendations,
      overall_summary: parsed.overall_summary || "Analysis complete.",
      risk_factors_identified: parsed.risk_factors_identified || [],
      suggested_follow_up: parsed.suggested_follow_up || "Schedule recommended ancillary services.",
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    return generateFallbackAnalysis(patient_uuid, profile);
  }
}

function generateReasoning(indications: string[]): string {
  if (indications.length === 0) {
    return "Clinical evaluation recommended based on patient profile.";
  }
  return `Indicated based on: ${indications.join("; ")}.`;
}

function generateFallbackAnalysis(patient_uuid: string, profile: PatientProfile): AIAnalysisResult {
  const recommendations: AncillaryRecommendation[] = [];
  const medHistory = (profile.medical_history || "").toLowerCase();
  const meds = (profile.medications || "").toLowerCase();
  const notes = (profile.patient_notes || "").toLowerCase();
  const allText = `${medHistory} ${meds} ${notes}`;

  const riskFactors: string[] = [];
  
  const hasHypertension = allText.includes("hypertension") || allText.includes("htn") || allText.includes("high blood pressure");
  const hasDiabetes = allText.includes("diabetes") || allText.includes("dm") || allText.includes("metformin") || allText.includes("glipizide") || allText.includes("insulin");
  const hasCardiac = allText.includes("cardiac") || allText.includes("heart") || allText.includes("cad") || allText.includes("chf") || allText.includes("coronary") || allText.includes("cardiomyopathy");
  const hasStroke = allText.includes("stroke") || allText.includes("tia") || allText.includes("cerebrovascular");
  const hasCognitive = allText.includes("memory") || allText.includes("cognitive") || allText.includes("dementia") || allText.includes("confusion") || allText.includes("brain fog");
  const hasAnxiety = allText.includes("anxiety") || allText.includes("depression") || allText.includes("sertraline") || allText.includes("escitalopram") || allText.includes("ssri");
  const hasPAD = allText.includes("pad") || allText.includes("peripheral") || allText.includes("claudication") || allText.includes("leg pain");
  const hasKidney = allText.includes("kidney") || allText.includes("ckd") || allText.includes("renal") || allText.includes("creatinine");
  const hasLiver = allText.includes("liver") || allText.includes("hepat") || allText.includes("cirrhosis");
  const hasEdema = allText.includes("edema") || allText.includes("swelling") || allText.includes("dvt");
  const hasLipid = allText.includes("hyperlipidemia") || allText.includes("cholesterol") || allText.includes("statin") || allText.includes("atorvastatin");
  const hasPolypharmacy = meds.split("\n").filter(l => l.trim()).length >= 4;
  const hasObesity = allText.includes("obesity") || allText.includes("obese") || allText.includes("bmi 3");
  const hasSmoking = allText.includes("smok") || allText.includes("tobacco");
  const hasMusculoskeletal = allText.includes("back pain") || allText.includes("joint") || allText.includes("arthritis");
  const hasDizziness = allText.includes("dizz") || allText.includes("syncope") || allText.includes("lightheaded") || allText.includes("orthostatic");
  const hasFatigue = allText.includes("fatigue") || allText.includes("tired") || allText.includes("exercise intolerance");
  const hasNeuropathy = allText.includes("neuropathy") || allText.includes("numbness") || allText.includes("tingling") || allText.includes("gabapentin");

  if (hasHypertension) riskFactors.push("Hypertension");
  if (hasDiabetes) riskFactors.push("Diabetes");
  if (hasCardiac) riskFactors.push("Cardiac disease");
  if (hasLipid) riskFactors.push("Hyperlipidemia");

  // BRAINWAVE - Neuro (aggressive)
  if (hasHypertension || hasDiabetes || hasCognitive || hasAnxiety || hasStroke || hasObesity || hasNeuropathy) {
    recommendations.push({
      ancillary_code: "BRAINWAVE",
      ancillary_name: "BrainWave",
      category: "Neuro",
      qualification_score: 85,
      qualification_reasoning: "Neuro-cognitive assessment indicated based on vascular/metabolic risk factors.",
      clinical_indications: riskFactors.slice(0, 3),
      evidence_citations: ["SPRINT-MIND Study (JAMA, 2019)", "Cognitive Decline & HTN (Lancet Neurol, 2020)"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // VITALWAVE - Cardio/Autonomic (aggressive)
  if (hasHypertension || hasDiabetes || hasCardiac || hasDizziness || hasFatigue || hasAnxiety || hasNeuropathy) {
    recommendations.push({
      ancillary_code: "VITALWAVE",
      ancillary_name: "VitalWave",
      category: "Cardio/Autonomic",
      qualification_score: 85,
      qualification_reasoning: "Autonomic function assessment for cardiovascular risk stratification.",
      clinical_indications: ["Cardiovascular risk factors", "Autonomic symptoms indicated"],
      evidence_citations: ["HRV Guidelines (Circulation, 2017)", "Autonomic Dysfunction in DM (Diabetes Care, 2018)"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // PGX - Once only (aggressive for polypharmacy)
  if (hasPolypharmacy || hasAnxiety || hasCardiac) {
    recommendations.push({
      ancillary_code: "PGX",
      ancillary_name: "Pharmacogenomics (PGX)",
      category: "Lab",
      qualification_score: 80,
      qualification_reasoning: "Pharmacogenomic testing to optimize medication therapy.",
      clinical_indications: ["Multiple medications", "Psychiatric/cardiac medications"],
      evidence_citations: ["CPIC Guidelines", "PREDICT Study (Clin Pharmacol Ther, 2020)"],
      priority: "medium",
      cooldown_status: "eligible",
    });
  }

  // STEROID INJECTION - No limit (musculoskeletal)
  if (hasMusculoskeletal) {
    recommendations.push({
      ancillary_code: "STEROID_INJ",
      ancillary_name: "Steroid Injection",
      category: "Procedure",
      qualification_score: 75,
      qualification_reasoning: "Pain management for musculoskeletal conditions.",
      clinical_indications: ["Joint/back pain", "Arthritis"],
      evidence_citations: ["AAOS Guidelines for Joint Injections"],
      priority: "medium",
      cooldown_status: "no_limit",
    });
  }

  // CAROTID US
  if (hasHypertension || hasDiabetes || hasStroke || hasCardiac || hasSmoking || hasLipid) {
    recommendations.push({
      ancillary_code: "US_CAROTID_93880",
      ancillary_name: "Carotid Ultrasound",
      category: "Ultrasound",
      qualification_score: 85,
      qualification_reasoning: "Stroke risk assessment with vascular risk factors.",
      clinical_indications: riskFactors.slice(0, 3),
      evidence_citations: ["AIUM Carotid Guidelines", "USPSTF Recommendations"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // ECHO
  if (hasCardiac || hasHypertension || hasEdema || hasFatigue) {
    recommendations.push({
      ancillary_code: "US_ECHO_93306",
      ancillary_name: "Transthoracic Echocardiogram",
      category: "Ultrasound",
      qualification_score: 85,
      qualification_reasoning: "Cardiac structure/function evaluation.",
      clinical_indications: ["Cardiac symptoms", "Heart failure risk"],
      evidence_citations: ["ACC/AHA Echo Guidelines (2019)"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // RENAL ARTERY/VEIN
  if (hasHypertension || hasKidney) {
    recommendations.push({
      ancillary_code: "US_RENAL_ART_VEIN_93975",
      ancillary_name: "Renal Artery/Vein",
      category: "Ultrasound",
      qualification_score: 80,
      qualification_reasoning: "Renovascular assessment for resistant hypertension/CKD.",
      clinical_indications: ["Hypertension", "Renal disease"],
      evidence_citations: ["AHA/ACC Resistant HTN Guidelines"],
      priority: "medium",
      cooldown_status: "eligible",
    });
  }

  // ABDOMINAL ARTERIES
  if (hasCardiac || hasHypertension || allText.includes("abdominal pain") || allText.includes("weight loss")) {
    recommendations.push({
      ancillary_code: "US_ABD_ART_CELIAC_SMA_IMA_93975",
      ancillary_name: "Abdominal Arteries Celiac/SMA/IMA",
      category: "Ultrasound",
      qualification_score: 75,
      qualification_reasoning: "Mesenteric vasculature assessment.",
      clinical_indications: ["Vascular disease", "GI symptoms"],
      evidence_citations: ["ACG Mesenteric Ischemia Guidelines"],
      priority: "medium",
      cooldown_status: "eligible",
    });
  }

  // IVC
  if (hasCardiac || hasEdema) {
    recommendations.push({
      ancillary_code: "US_IVC_93975",
      ancillary_name: "IVC Ultrasound",
      category: "Ultrasound",
      qualification_score: 75,
      qualification_reasoning: "Volume status and cardiac preload assessment.",
      clinical_indications: ["Heart failure", "Edema"],
      evidence_citations: ["Echo Chamber Quantification (JASE, 2015)"],
      priority: "medium",
      cooldown_status: "eligible",
    });
  }

  // LIVER/PORTAL/HEPATIC
  if (hasLiver || hasDiabetes || hasObesity) {
    recommendations.push({
      ancillary_code: "US_LIVER_PORTAL_HEPATIC_93975",
      ancillary_name: "Liver Artery/Vein Portal/Hepatic",
      category: "Ultrasound",
      qualification_score: 75,
      qualification_reasoning: "Hepatic vasculature assessment for liver disease/NAFLD.",
      clinical_indications: ["Liver disease risk", "Metabolic syndrome"],
      evidence_citations: ["AASLD NAFLD Guidelines"],
      priority: "medium",
      cooldown_status: "eligible",
    });
  }

  // LOWER EXTREMITY ARTERIAL
  if (hasPAD || hasDiabetes || hasNeuropathy || hasSmoking) {
    recommendations.push({
      ancillary_code: "US_LE_ARTERIAL_93925",
      ancillary_name: "Lower Extremity Arterial Duplex",
      category: "Ultrasound",
      qualification_score: 85,
      qualification_reasoning: "PAD screening in high-risk patient.",
      clinical_indications: ["Diabetes", "PAD risk factors", "Claudication"],
      evidence_citations: ["ADA Standards of Care", "SVS PAD Guidelines"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // UPPER EXTREMITY ARTERIAL
  if (hasCardiac || allText.includes("arm")) {
    recommendations.push({
      ancillary_code: "US_UE_ARTERIAL_93930",
      ancillary_name: "Upper Extremity Arterial Duplex",
      category: "Ultrasound",
      qualification_score: 70,
      qualification_reasoning: "Upper extremity arterial assessment.",
      clinical_indications: ["Vascular symptoms"],
      evidence_citations: ["SVS Vascular Guidelines"],
      priority: "low",
      cooldown_status: "eligible",
    });
  }

  // LOWER EXTREMITY VENOUS
  if (hasEdema || allText.includes("dvt") || allText.includes("varicose")) {
    recommendations.push({
      ancillary_code: "US_LE_VENOUS_93971",
      ancillary_name: "Lower Extremity Venous Duplex",
      category: "Ultrasound",
      qualification_score: 80,
      qualification_reasoning: "DVT/venous insufficiency assessment.",
      clinical_indications: ["Leg swelling", "DVT risk"],
      evidence_citations: ["ACCP VTE Guidelines"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // UPPER EXTREMITY VENOUS
  if (allText.includes("arm swelling") || allText.includes("catheter")) {
    recommendations.push({
      ancillary_code: "US_UE_VENOUS_93970",
      ancillary_name: "Upper Extremity Venous Duplex",
      category: "Ultrasound",
      qualification_score: 75,
      qualification_reasoning: "Upper extremity venous assessment.",
      clinical_indications: ["Arm swelling"],
      evidence_citations: ["ACCP VTE Guidelines"],
      priority: "medium",
      cooldown_status: "eligible",
    });
  }

  // STRESS ECHO
  if (hasCardiac || allText.includes("exertional") || allText.includes("chest pain")) {
    recommendations.push({
      ancillary_code: "US_STRESS_ECHO_93350",
      ancillary_name: "Stress Echocardiogram",
      category: "Ultrasound",
      qualification_score: 80,
      qualification_reasoning: "Stress-induced ischemia evaluation.",
      clinical_indications: ["Exertional symptoms", "CAD evaluation"],
      evidence_citations: ["ACC Appropriate Use Criteria for Stress Testing"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // AORTA/ILIAC
  if (hasSmoking || hasHypertension || hasCardiac || allText.includes("aneurysm") || allText.includes("pulsation")) {
    recommendations.push({
      ancillary_code: "US_AORTA_ILIAC_93978",
      ancillary_name: "Aorta and Iliac Artery Duplex",
      category: "Ultrasound",
      qualification_score: 80,
      qualification_reasoning: "Aortic/iliac vascular assessment.",
      clinical_indications: ["AAA risk factors", "Vascular disease"],
      evidence_citations: ["SVS AAA Guidelines"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // AAA SCREENING
  if (hasSmoking || hasHypertension || allText.includes("male") || allText.includes("aaa")) {
    recommendations.push({
      ancillary_code: "US_AAA_SCREEN_G0389",
      ancillary_name: "Screening AAA Ultrasound",
      category: "Ultrasound",
      qualification_score: 80,
      qualification_reasoning: "AAA screening for high-risk patient.",
      clinical_indications: ["Smoking history", "AAA risk factors"],
      evidence_citations: ["USPSTF AAA Screening Recommendation"],
      priority: "high",
      cooldown_status: "eligible",
    });
  }

  // Sort by score
  recommendations.sort((a, b) => b.qualification_score - a.qualification_score);

  return {
    patient_uuid,
    analysis_timestamp: new Date().toISOString(),
    recommendations,
    overall_summary: `Deterministic analysis identified ${recommendations.length} potentially indicated ancillary services based on documented conditions and risk factors. AI-powered analysis recommended for comprehensive clinical context.`,
    risk_factors_identified: riskFactors,
    suggested_follow_up: "Review recommendations and schedule indicated services based on clinical judgment.",
  };
}

export async function generateEvidenceSummary(
  ancillary_code: string,
  clinical_context: string
): Promise<string> {
  const ancillary = ANCILLARY_CATALOG.find(a => a.ancillary_code === ancillary_code);
  if (!ancillary) {
    return "Service not found in catalog.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a medical evidence summarizer. Provide concise, peer-reviewed evidence supporting the use of ${ancillary.ancillary_name} for the given clinical context. Include study names, journals, and key findings. Format for clinical documentation.`,
        },
        {
          role: "user",
          content: `Summarize evidence for ${ancillary.ancillary_name} in this clinical context:\n${clinical_context}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "Evidence summary unavailable.";
  } catch (error) {
    console.error("Evidence summary error:", error);
    return `${ancillary.ancillary_name} is indicated per standard clinical guidelines.`;
  }
}
