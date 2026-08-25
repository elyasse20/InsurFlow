import { NextResponse } from 'next/server';
import { RiskAssessmentRequest, RiskAssessmentResponse, RiskLevel } from '@/types';

export async function POST(request: Request) {
  try {
    const body: RiskAssessmentRequest = await request.json();

    const age = body.clientAge ?? 35;
    const claims = body.historyClaimsCount ?? 0;
    const mileage = body.annualMileage ?? 15000;
    const vehicle = (body.vehicleType ?? 'Berline').trim();
    const usage = (body.usageType ?? 'Personnel').trim();
    const category = (body.category ?? 'AUTO').trim().toUpperCase();
    const _budget = body.clientCreditBudget ?? 5000;

    let score = 70;
    const flags: string[] = [];
    const guarantees: string[] = [];

    // 1. Age Factor
    if (age < 23) {
      score -= 18;
      flags.push('Jeune conducteur (< 23 ans) : risque statistique de sinistralité plus élevé.');
    } else if (age < 26) {
      score -= 8;
      flags.push('Conducteur novice (23-25 ans) : période probatoire sous observation.');
    } else if (age >= 26 && age <= 65) {
      score += 10;
      flags.push("Tranche d'âge optimale (26-65 ans) avec maturité de conduite.");
    } else {
      score -= 5;
      flags.push('Conducteur senior (> 65 ans) : vigilance sur les réflexes et les trajets nocturnes.');
    }

    // 2. Claims History
    if (claims === 0) {
      score += 15;
      flags.push('Aucun sinistre déclaré sur les 3 dernières années (Bonus maximal).');
    } else if (claims === 1) {
      score -= 10;
      flags.push('1 sinistre matériel déclaré au cours des 24 derniers mois.');
    } else if (claims === 2) {
      score -= 25;
      flags.push('2 sinistres récents : profil à risque intermédiaire.');
    } else {
      score -= 40;
      flags.push(`Sinistralité répétée (${claims} sinistres déclarés) : profil à haut risque.`);
    }

    // 3. Mileage Factor
    if (mileage <= 8000) {
      score += 10;
      flags.push('Faible kilométrage annuel (≤ 8 000 km/an) : exposition au risque minimale.');
    } else if (mileage <= 18000) {
      score += 5;
      flags.push('Kilométrage standard (usage modéré et maîtrisé).');
    } else if (mileage <= 30000) {
      score -= 8;
      flags.push('Kilométrage élevé (18 000 - 30 000 km/an) : forte exposition routière.');
    } else {
      score -= 18;
      flags.push('Kilométrage intensif (> 30 000 km/an) : exposition continue aux aléas de la route.');
    }

    // 4. Vehicle Type & Power Profile
    const vLower = vehicle.toLowerCase();
    if (vLower.includes('sport') || vLower.includes('luxe') || vLower.includes('coupé')) {
      score -= 15;
      flags.push('Véhicule Sport / Prestige : valeur à neuf élevée et rapport poids/puissance dynamique.');
    } else if (vLower.includes('deux-roues') || vLower.includes('moto') || vLower.includes('scooter')) {
      score -= 18;
      flags.push('Deux-roues motorisé : vulnérabilité corporelle et risque de vol accru.');
    } else if (vLower.includes('utilitaire') || vLower.includes('camion') || vLower.includes('poids lourd')) {
      score -= 6;
      flags.push('Véhicule utilitaire / professionnel : déplacements fréquents et charges transportées.');
    } else if (vLower.includes('suv') || vLower.includes('4x4')) {
      score += 2;
      flags.push('Véhicule SUV : sécurité passive et habitabilité renforcées.');
    } else {
      score += 6;
      flags.push('Véhicule de tourisme standard : coût moyen des réparations modéré.');
    }

    // 5. Usage Profile
    const uLower = usage.toLowerCase();
    if (uLower.includes('personnel') || uLower.includes('privé')) {
      score += 6;
      flags.push('Usage privé et trajets domicile-travail conventionnels.');
    } else if (uLower.includes('commercial') || uLower.includes('marchandise') || uLower.includes('transport')) {
      score -= 12;
      flags.push('Transport professionnel de biens ou de personnes : fréquence de roulage soutenue.');
    } else if (uLower.includes('flotte') || uLower.includes('intensif') || uLower.includes('multi')) {
      score -= 14;
      flags.push('Usage intensif / multi-conducteurs.');
    }

    // Guarantees recommendations
    if (category.includes('MARITIME')) {
      guarantees.push('Corps de navire', 'Responsabilité civile maritime', 'Recours des tiers', 'Pertes et avaries');
    } else if (category.includes('SANT')) {
      guarantees.push('Hospitalisation 100%', 'Soins courants & Dentaire', 'Assistance rapatriement');
    } else if (category.includes('MULT')) {
      guarantees.push('Incendie et Explosion', 'Dégâts des eaux', 'Vol et Vandalisme', 'Responsabilité civile chef de famille');
    } else {
      guarantees.push('Responsabilité Civile (Obligatoire)', 'Défense et Recours', 'Bris de glace', 'Vol et Incendie', 'Assistance Panne 24/7 (0 Km)');
      if (score >= 70) {
        guarantees.push('Individuelle Conducteur Premium');
      } else if (score < 50) {
        guarantees.push('Tous Risques avec franchise adaptée', 'Protection Juridique Étendue');
      } else {
        guarantees.push('Dommages Collision');
      }
    }

    score = Math.max(10, Math.min(98, score));

    let riskLevel: RiskLevel;
    let summary: string;
    let pricingRecommendation: string;

    if (score >= 75) {
      riskLevel = 'LOW';
      summary = 'Profil hautement sécurisé présentant un historique irréprochable et des paramètres de conduite modérés. Risque technique très faible.';
      pricingRecommendation = 'Appliquer une réduction standard de 10% à 15% sur la prime de base nette (Bonus Excellence). Offrir l\'assistance 0 km.';
    } else if (score >= 50) {
      riskLevel = 'MEDIUM';
      summary = 'Profil de risque standard à modéré. Les paramètres de conduite et les garanties demandées sont conformes aux barèmes usuels du cabinet.';
      pricingRecommendation = 'Maintenir le tarif de référence avec application d\'une franchise standard de 2.5% sur les garanties dommages matériels.';
    } else {
      riskLevel = 'HIGH';
      summary = 'Profil à risque élevé identifié (antécédents récents, puissance véhicule ou intensité kilométrique). Vigilance requise en souscription.';
      pricingRecommendation = 'Majorer la prime de base de +20% ou appliquer une franchise minimale de 5% avec validation préalable du comité de souscription.';
    }

    const response: RiskAssessmentResponse = {
      riskLevel,
      riskScore: score,
      summary,
      pricingRecommendation,
      recommendedGuarantees: guarantees,
      flags,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error assessing risk in Next.js route:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'évaluation du risque' },
      { status: 500 }
    );
  }
}
