// Programme officiel DSCG — session 2027
// Source : arrêté du 4 août 2025 (BOESR n° 32 du 28/08/2025), annexe 2.
// Durées et coefficients : article 11 de l'arrêté (identiques à l'arrêté de 2019).
// est:true = volume non fixé par l'annexe (réparti à titre indicatif, modifiable dans Réglages).

const S = (title, items, note) => ({ title, items, note });
const C = (num, title, hours, subs, opts = {}) => ({ num, title, hours, subs, ...opts });
const P = (num, title, hours, chapters, opts = {}) => ({ num, title, hours, chapters, ...opts });

const RAW = [
  {
    id: 'UE1', code: 'UE 1', name: 'Gestion juridique, fiscale et sociale', short: 'Droit',
    coef: 1.5, duree: 4, hours: 180, ects: 20, cnam: 'TEC211',
    parts: [
      P('0', 'Prérequis DCG — axe juridique', 24, [
        C('0.1', 'DCG UE 1 — Fondamentaux du droit', 6, [S('Rappels essentiels', ['Contrats, responsabilité, preuve'])]),
        C('0.2', 'DCG UE 2 — Droit des sociétés', 6, [S('Rappels essentiels', ['Formes sociales, fonctionnement, dirigeants'])]),
        C('0.3', 'DCG UE 3 — Droit social', 6, [S('Rappels essentiels', ['Contrat de travail, relations collectives'])]),
        C('0.4', 'DCG UE 4 — Droit fiscal', 6, [S('Rappels essentiels', ['IS, TVA, IR, plus-values'])]),
      ], { prereq: true, est: true }),
      P('1', 'Accompagner le client dans son environnement juridique', 65, [
        C('1.1', 'Analyser les relations contractuelles liées à l\'activité du client', 25, [
          S('Contrats de vente et de distribution', ['Contrat-cadre', 'Vente et pacte de préférence', 'Franchise, concession exclusive, distribution exclusive et sélective']),
          S('Contrats d\'entreprise et de sous-traitance', ['Contrat d\'entreprise', 'Contrat de sous-traitance']),
          S('Contrats d\'assurance', ['Mécanisme, formation, effets (dont stipulation pour autrui)', 'RC, homme clé, perte d\'exploitation, IARD']),
          S('Contrats de consommation', ['Vente forcée, refus de vente, vente par lot ou à prime', 'Soldes, vente en liquidation']),
          S('Données personnelles', ['Types de données, droits des personnes', 'Rôle et pouvoirs de la CNIL, principes directeurs']),
          S('Site internet et commerce électronique', ['Contrat et signature électroniques', 'Nom de domaine', 'CGV, CGU, responsabilités hébergeurs et éditeurs']),
        ]),
        C('1.2', 'Conduire le client dans une démarche d\'éthique des affaires', 40, [
          S('Gouvernance et acteurs', ['Acteurs internes et externes, « appliquer ou expliquer »', 'Codes de gouvernance', 'Dissociation PDG, administrateur référent, cumul de mandats', 'Composition des conseils, parité, indépendance, salariés', 'Relations dirigeants-associés, rémunérations']),
          S('Informations et responsabilité durables', ['Informations sociales et environnementales, RSE', 'Résolutions climatiques, rapport de durabilité', 'Devoir de vigilance, raison d\'être, société à mission', 'Sanctions, préjudice écologique']),
          S('Conformité', ['LCB-FT : assujettis, vigilance, déclaration', 'Anticorruption, trafic d\'influence, CJIP']),
          S('Risques pénaux des sociétés', ['Délégation de pouvoirs', 'Délits sociétaires (ABS, dividendes fictifs, comptes non fidèles…)', 'Délits liés au contrôle légal des comptes']),
          S('Relations avec l\'administration fiscale', ['Agrément, rescrit', 'Contrôle fiscal, procédures amiable et contentieuse', 'Abus de droit, acte anormal de gestion, fraude fiscale']),
          S('Fiscalité internationale', ['Prix de transfert', 'Territorialité, double imposition', 'TVA internationale, lutte contre l\'évasion fiscale']),
        ]),
      ]),
      P('2', 'Accompagner le développement de l\'activité du client', 65, [
        C('2.1', 'Accompagner le financement de l\'activité du client', 20, [
          S('Financement interne', ['Augmentations et réductions de capital, rachat d\'actions', 'Compte courant d\'associé']),
          S('Financement externe', ['Offre au public de titres, financement participatif', 'Emprunts obligataires, crédit-bail, crédit aux entreprises', 'Crédit interentreprises']),
          S('Garanties personnelles', ['Cautionnement, lettre d\'intention', 'Porte-fort, garantie autonome']),
          S('Garanties réelles et privilèges', ['Gage, nantissements, hypothèque', 'Privilèges du Trésor et de la Sécurité sociale', 'Autres privilèges spéciaux']),
        ]),
        C('2.2', 'Accompagner la structuration de l\'activité du client', 35, [
          S('Régimes matrimoniaux et concubinage', ['Communauté universelle, participation aux acquêts', 'Aménagements du PACS', 'Organisation patrimoniale du concubinage']),
          S('Constitution et transformation des sociétés', ['Sociétés civiles, SNC, SARL, SA, SAS, SCA', 'Transformation des sociétés']),
          S('Pactes d\'associés', ['Clauses statutaires et extrastatutaires', 'Formation et révision du pacte', 'Clauses usuelles (préemption, agrément, sortie conjointe…)', 'Non-respect du pacte']),
          S('Groupes de sociétés', ['Contrôle, participations croisées, autocontrôle', 'Conventions intragroupe, abandons de créances', 'Régime mère-filiales, intégration fiscale IS et TVA', 'GIE, SE, coopération interentreprises', 'Comité de groupe, coemploi, UES']),
          S('Restructurations (aspects juridiques)', ['Fusion, scission, dissolution-confusion', 'Apport partiel d\'actifs, TUP']),
          S('Associations et fondations', ['Associations : non-lucrativité, gouvernance, CAC', 'Fondations : FRUP, fondation d\'entreprise']),
        ]),
        C('2.3', 'Prévenir les pratiques contraires au droit de la concurrence', 10, [
          S('Règles de concurrence', ['Concentrations, abus de position dominante, abus de dépendance, ententes', 'Autorité de la concurrence, transaction']),
          S('Pratiques restrictives', ['Revente à perte, prix abusivement bas', 'Déséquilibre significatif, rupture brutale, délais de paiement']),
          S('Concurrence déloyale et appels d\'offres', ['Dénigrement, parasitisme, imitation, désorganisation', 'Appels d\'offres : champ, seuils']),
        ]),
      ]),
      P('3', 'Accompagner la continuité de l\'activité du client selon le contexte', 50, [
        C('3.1', 'Conseiller le client sur la transmission de son activité', 20, [
          S('Transmission de l\'activité et du patrimoine', ['Location-gérance', 'Transmission du fonds de commerce']),
          S('Transmission de droits sociaux', ['Cession de droits sociaux', 'Conventions de garantie']),
          S('Modes de transmission', ['Transmission pour cause de décès', 'Cession à titre gratuit ou onéreux']),
        ]),
        C('3.2', 'Accompagner le client dans les difficultés de son activité', 24, [
          S('Prévention des difficultés', ['Documents prévisionnels, procédures d\'alerte', 'Cessation des paiements', 'Mandat ad hoc, conciliation']),
          S('Traitement judiciaire', ['Sauvegarde, redressement, liquidation', 'Rétablissement professionnel, ordre des créanciers', 'Situation des salariés, aspects fiscaux']),
          S('Sanctions civiles et pénales', ['Faillite personnelle, interdiction de gérer', 'Insuffisance d\'actif', 'Banqueroute']),
        ]),
        C('3.3', 'Accompagner la cessation de l\'activité du client', 6, [
          S('Cessation d\'activité', ['Cessation d\'une entreprise individuelle', 'Dissolution de la société (conséquences fiscales)']),
        ]),
      ]),
    ],
  },
  {
    id: 'UE2', code: 'UE 2', name: 'Finance', short: 'Finance',
    coef: 1, duree: 3, hours: 140, ects: 15, cnam: 'TEC212',
    parts: [
      P('1', 'Diagnostic financier approfondi à partir de comptes consolidés', 15, [
        C('1', 'Établir un diagnostic financier de groupe', 15, [
          S('Démarche et référentiel', ['Diagnostic selon le référentiel utilisé', 'Démarche du diagnostic']),
          S('Activité et rentabilité', ['Analyse de l\'activité', 'ROCE, ROIC, ROE']),
          S('Structure financière et flux', ['Structure financière', 'Analyse par les flux de trésorerie']),
        ]),
      ]),
      P('2', 'Performance durable et responsabilité sociétale', 15, [
        C('2.1', 'Analyser l\'information extra-financière', 10, [
          S('Gouvernance et création de valeur', ['AFEP-MEDEF, théorie de l\'agence, société à mission', 'Valeur actionnariale (Jensen et Meckling) et partenariale']),
          S('RSE, ESG et scoring', ['RSE et critères extra-financiers', 'Principes de l\'investisseur responsable', 'Mesures ESG et scoring']),
        ]),
        C('2.2', 'Identifier les enjeux éthiques', 5, [
          S('Éthique, conformité et risques', ['Bâle, fraude, Tracfin', 'Sapin II, alerte, vigilance, loi de blocage', 'MiCA, cyber-risques']),
        ]),
      ]),
      P('3', 'Méthodes d\'évaluation de l\'entreprise', 20, [
        C('3.1', 'Méthodes par les flux financiers', 8, [
          S('Business plan, CMPC et MEDAF', ['CMPC, rentabilité exigée (MEDAF)', 'Gordon-Shapiro (valeur terminale)']),
          S('FTD et FTA', ['Flux revenant aux apporteurs de capitaux', 'Flux revenant aux actionnaires']),
        ]),
        C('3.2', 'Méthodes par les comparables', 4, [
          S('Multiples', ['Inducteurs VGE (EBE, REX, EBITDA…)', 'Inducteurs VCP (RN, RCAI…)', 'Échantillons de comparables']),
        ]),
        C('3.3', 'Autres méthodes', 8, [
          S('Patrimoniale et goodwill', ['ANC, ANCC', 'Rente du goodwill']),
          S('Approches spécifiques', ['Approche immobilière', 'Méthode venture capital (start-up)']),
        ]),
      ]),
      P('4', 'Opérations d\'ingénierie financière', 20, [
        C('4.1', 'Effets de la politique de dividende', 3, [
          S('Politique de dividende', ['Effets informationnels, signal (Spence, Ross)', 'Théories et déterminants']),
        ]),
        C('4.2', 'Opérations de haut de bilan', 17, [
          S('Nombre d\'actions et rachats', ['Opérations affectant le nombre d\'actions', 'Rachats d\'actions']),
          S('Restructurations et holdings', ['Fusion, acquisition, APA, scission', 'Recours aux holdings']),
          S('LBO, introductions et offres publiques', ['Opérations à effet de levier', 'Introductions et retraits de cote', 'Offres publiques']),
        ]),
      ]),
      P('5', 'Finance de marché et finance comportementale', 25, [
        C('5.1', 'Fondamentaux des théories financières des marchés', 6, [
          S('Efficience et asymétries', ['Asymétries d\'information (Akerlof)', 'Efficience (Fama)', 'Organisation des marchés']),
          S('Finance comportementale', ['Anomalies et biais cognitifs (Kahneman, Tversky)', 'Cygnes noirs (Taleb)']),
        ]),
        C('5.2', 'Gérer le couple rentabilité-risque', 9, [
          S('Modèles d\'équilibre', ['Gordon-Shapiro', 'MEDAF et limites', 'Fama et French (3 facteurs)']),
          S('Mesures du risque', ['Primes de risque', 'Bêta, écart-type, variance']),
        ]),
        C('5.3', 'Gérer un portefeuille efficient de titres', 6, [
          S('Portefeuille efficient', ['Risque spécifique et systématique', 'Diversification'], 'Coefficients de corrélation fournis à l\'épreuve'),
        ]),
        C('5.4', 'Innovations et stratégie financière', 4, [
          S('Numérique et finance', ['Fintechs, crowdfunding, crypto-actifs', 'Finance algorithmique, IA, blockchain']),
        ]),
      ]),
      P('6', 'Gérer les risques et la trésorerie', 25, [
        C('6.1', 'Gestion centralisée de la trésorerie', 6, [
          S('Centralisation', ['Mécanismes financiers et bancaires', 'Netting, cash pooling', 'Supports de financement et de placement']),
        ]),
        C('6.2', 'Risque de taux d\'intérêt', 8, [
          S('Instruments de taux', ['Futures, options sur taux', 'FRA, forward-forward', 'Cap, floor, collar', 'Swap de taux']),
        ]),
        C('6.3', 'Risque de change', 8, [
          S('Techniques internes', ['Termaillage, netting, indexation']),
          S('Couvertures externes', ['Coface, avances en devises', 'Change à terme, options, futures', 'Swap de devises']),
        ]),
        C('6.4', 'Risques climatiques et limites planétaires', 3, [
          S('Couverture climat et matières', ['Assurance des risques climatiques', 'Dérivés climatiques et matières premières']),
        ]),
      ]),
      P('7', 'Investissement et financement en milieu incertain', 20, [
        C('7.1', 'Opportunité d\'un investissement ou désinvestissement', 10, [
          S('Critères de choix', ['Critères de sélection, projets exclusifs ou liés', 'Milieu probabilisable', 'Désinvestissement']),
        ]),
        C('7.2', 'Proposer des solutions de financement', 10, [
          S('Théories du financement', ['Myers et Majluf, théorie du compromis']),
          S('Sources de financement', ['Fonds propres, quasi-fonds propres', 'Bancaire, obligataire, court terme', 'Capital investissement, financements publics', 'Financements durables et verts']),
        ]),
      ]),
    ],
  },
  {
    id: 'UE4', code: 'UE 4', name: 'Comptabilité et audit', short: 'Compta-audit',
    coef: 1.5, duree: 4, hours: 180, ects: 20, cnam: 'TEC214',
    parts: [
      P('1', 'Opérations de restructuration', 25, [
        C('1.1', 'Cadre économique, comptable et fiscal', 4, [
          S('Typologie et référentiel', ['Fusions, scissions, APA, fusions simplifiées, TUP', 'Référentiel comptable applicable']),
          S('Régimes fiscaux', ['Droit commun et régime de faveur', 'Plus/moins-values, déficits', 'Engagements du régime de faveur']),
        ], { est: true }),
        C('1.2', 'Impact financier, comptable et fiscal', 6, [
          S('Parité et rémunération', ['Parité d\'échange, nombre d\'actions', 'Soulte']),
          S('Valorisation des apports', ['Valeur comptable ou réelle', 'Identification des éléments apportés']),
        ], { est: true }),
        C('1.3', 'Traitement comptable des restructurations', 12, [
          S('Écritures de base', ['Chez l\'absorbante et l\'absorbée']),
          S('Détentions préalables et boni/mali', ['Avec ou sans détention préalable', 'Boni, mali, suivi du mali technique']),
          S('Écritures complémentaires', ['Liées au régime fiscal']),
        ], { est: true }),
        C('1.4', 'Restitution au dirigeant', 3, [
          S('Impacts sur les documents de synthèse', ['Analyse et restitution synthétique']),
        ], { est: true }),
      ]),
      P('2', 'Reporting financier des groupes (normes françaises et IFRS)', 80, [
        C('2.1', 'Principes de consolidation', 10, [
          S('Cadre normatif', ['Cadre conceptuel IASB', 'EFRAG, IFRIC, IASB', 'Contexte légal ANC et IFRS']),
          S('Périmètre et méthodes', ['Obligation de consolider, exceptions', 'Périmètre', 'Intégration globale, proportionnelle, mise en équivalence']),
        ], { lacune: true }),
        C('2.2', 'Processus d\'élaboration des comptes de groupe', 60, [
          S('Processus global', ['Étapes de la consolidation']),
          S('Retraitements préparatoires', ['Élimination des écritures fiscales', 'Homogénéisation (normes françaises et IFRS)']),
          S('Conversion des comptes en devises', ['Méthodes de conversion']),
          S('Éliminations internes', ['Comptes réciproques', 'Résultats internes']),
          S('Écarts d\'évaluation et d\'acquisition', ['Goodwill, badwill']),
          S('Partage des capitaux propres', ['Filiales directes et indirectes']),
        ], { lacune: true }),
        C('2.3', 'Documents de synthèse des groupes', 10, [
          S('Normes françaises', ['Bilan, compte de résultat, annexe consolidés']),
          S('IFRS', ['Situation financière, résultat global', 'Variation des capitaux propres', 'Tableau des flux de trésorerie']),
        ], { lacune: true }),
      ]),
      P('3', 'Audit', 75, [
        C('3.1', 'Cadre légal et institutionnel de la profession', 20, [
          S('Cadres d\'exercice', ['EC, CAC, auditeurs de durabilité', 'Nomination et cessation des missions']),
          S('Déontologie et normes', ['Principes déontologiques', 'Référentiel normatif, NEP']),
          S('Responsabilités', ['Civile, pénale, professionnelle']),
        ]),
        C('3.2', 'Mission de certification des états financiers', 30, [
          S('Cadre conceptuel et moyens du CAC', ['Audit des comptes sociaux et consolidés', 'Moyens d\'action']),
          S('Approche par les risques et phases', ['Approche par les risques', 'Phases de la mission']),
          S('Techniques et supports', ['Procédures d\'audit', 'Supports de chaque phase']),
          S('Rapports et opinions', ['Rapports sur les comptes', 'Portée des opinions']),
        ]),
        C('3.3', 'Cadre conceptuel du reporting de durabilité', 15, [
          S('Acteurs et architecture', ['Acteurs européens et internationaux', 'Architecture des normes']),
          S('Principes ESRS', ['Champ d\'application', 'Double matérialité, IRO, chaîne de valeur']),
        ]),
        C('3.4', 'Démarche générale d\'audit de durabilité', 10, [
          S('Certification des informations de durabilité', ['Objectifs, nature de l\'assurance', 'Démarche de vérification', 'Rapport et avis']),
        ]),
      ]),
    ],
  },
];

export const UES = RAW.map(ue => {
  const parts = ue.parts.map(p => {
    const pid = `${ue.id}-P${p.num}`;
    const chapters = p.chapters.map(c => {
      const cid = `${ue.id}-${c.num}`;
      const n = c.subs.length;
      const subs = c.subs.map((s, i) => ({
        id: `${cid}-${String.fromCharCode(97 + i)}`,
        ue: ue.id, part: pid, chapter: cid,
        num: `${c.num}${String.fromCharCode(97 + i)}`,
        title: s.title, items: s.items, note: s.note || '',
        hours: Math.round((c.hours / n) * 10) / 10,
        prereq: !!p.prereq, lacune: !!c.lacune,
      }));
      return { ...c, id: cid, ue: ue.id, part: pid, subs, est: !!(c.est || p.est), prereq: !!p.prereq };
    });
    return { ...p, id: pid, ue: ue.id, chapters };
  });
  return { ...ue, parts };
});

export const UE_BY_ID = Object.fromEntries(UES.map(u => [u.id, u]));
export const CHAPTERS = UES.flatMap(u => u.parts.flatMap(p => p.chapters));
export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
export const TOPICS = CHAPTERS.flatMap(c => c.subs);
export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map(t => [t.id, t]));

export const STEPS = [
  { id: 'cours', label: 'Cours' },
  { id: 'fiche', label: 'Fiche' },
  { id: 'exos', label: 'Exercices' },
  { id: 'annales', label: 'Annales' },
  { id: 'memo', label: 'Mémorisation' },
];

export const COMPETENCES = ['Identifier', 'Analyser', 'Contrôler', 'Conseiller'];

export const ERROR_CATS = {
  UE1: ['Syllogisme juridique', 'Qualification des faits', 'Règle oubliée ou erronée', 'Calcul fiscal'],
  UE2: ['Erreur de calcul', 'Formule', 'Interprétation / commentaire', 'Hypothèse mal lue'],
  UE4: ['Retraitement', 'Écriture comptable', '% d\'intérêt / de contrôle', 'Démarche d\'audit'],
  ALL: ['Méthodologie', 'Gestion du temps', 'Rédaction', 'Notion de cours'],
};

export function topicLabel(t) {
  return `${UE_BY_ID[t.ue].code} · ${t.num} ${t.title}`;
}
