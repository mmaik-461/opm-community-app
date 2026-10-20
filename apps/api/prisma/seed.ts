import { createHash } from 'node:crypto';
import { PrismaClient, TravelStatus } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password';

const prisma = new PrismaClient();
const DIMENSIONS = 1536;

interface SeedProfile {
  fullName: string;
  headline: string;
  bio: string;
  city: string;
  travelStatus?: TravelStatus;
  cohort: string;
  industry: string;
  skills: string[];
}

const profiles: SeedProfile[] = [
  {
    fullName: 'Anna Kowalska',
    headline: 'Co-founder & CEO, PayLoop',
    city: 'Warsaw',
    cohort: 'OPM 48',
    industry: 'Fintech',
    bio: 'Built a B2B payments orchestration platform serving 400+ CEE merchants. Deep experience in PSD2 compliance, banking partnerships and Series A fundraising. Happy to mentor on regulated-product go-to-market.',
    skills: ['payments', 'PSD2', 'fundraising', 'banking partnerships'],
  },
  {
    fullName: 'James Whitfield',
    headline: 'VP Product, LedgerWise',
    city: 'London',
    cohort: 'OPM 50',
    industry: 'Fintech',
    bio: 'Ex-Revolut product lead now running product at a SME accounting and lending startup. Strong on credit-risk data products, open banking APIs and scaling product teams from 5 to 40.',
    skills: ['open banking', 'lending', 'product management', 'credit risk'],
  },
  {
    fullName: 'Oleksandr Bondarenko',
    headline: 'Founder, KyivPay',
    city: 'Kyiv',
    cohort: 'OPM 52',
    industry: 'Fintech',
    bio: 'Launched a cross-border remittance app for Ukrainian diaspora across the EU. Expert in KYC/AML tooling, wartime operations resilience and mobile-first growth in emerging markets.',
    skills: ['remittances', 'KYC/AML', 'mobile growth', 'resilience'],
  },
  {
    fullName: 'Priya Raman',
    headline: 'Head of Risk, Merlion Capital Tech',
    city: 'Singapore',
    cohort: 'OPM 50',
    industry: 'Fintech',
    bio: 'Quant-turned-operator building fraud and risk engines for APAC digital banks. Can advise on MAS licensing, ML fraud detection and hiring data science teams in Southeast Asia.',
    skills: ['fraud detection', 'MAS licensing', 'machine learning', 'APAC expansion'],
  },
  {
    fullName: 'Marcus Feldman',
    headline: 'Managing Partner, Alpine Ventures',
    city: 'New York',
    cohort: 'OPM 48',
    industry: 'Fintech',
    bio: 'Invests in pre-seed to Series A fintech and infrastructure startups in the US and Europe. Former investment banker; can offer intros to US banks and help founders prepare for US market entry.',
    skills: ['venture capital', 'US market entry', 'investor intros', 'M&A'],
  },
  {
    fullName: 'Dr. Lena Hoffmann',
    headline: 'CEO, VitalSense Health',
    city: 'Berlin',
    cohort: 'OPM 50',
    industry: 'HealthTech',
    bio: 'Medical doctor who founded a remote patient monitoring platform reimbursed under the German DiGA scheme. Knows MDR certification, clinical validation and hospital sales cycles inside out.',
    skills: ['DiGA', 'MDR certification', 'clinical validation', 'hospital sales'],
  },
  {
    fullName: 'Daniel Okafor',
    headline: 'CTO, MediBridge',
    city: 'London',
    cohort: 'OPM 52',
    industry: 'HealthTech',
    bio: 'Leads engineering for an NHS-integrated telehealth platform. Experienced with FHIR interoperability, HIPAA/GDPR-compliant architecture and building secure ML pipelines on health data.',
    skills: ['FHIR', 'GDPR', 'health data', 'platform engineering'],
  },
  {
    fullName: 'Sofiia Melnyk',
    headline: 'Founder, MindHarbor',
    city: 'Kyiv',
    cohort: 'OPM 52',
    industry: 'HealthTech',
    bio: 'Created a mental health app offering trauma-informed CBT programs for war-affected communities. Raised grants and angel funding; strong in impact measurement, content partnerships and NGO collaboration.',
    skills: ['mental health', 'impact measurement', 'grants', 'NGO partnerships'],
  },
  {
    fullName: 'Rachel Goldberg',
    headline: 'Chief Commercial Officer, CareLoop',
    city: 'New York',
    cohort: 'OPM 48',
    industry: 'HealthTech',
    bio: 'Scaled a digital chronic-care company to 120 employees and enterprise payer contracts. Can help with US payer negotiations, value-based care pricing and enterprise sales playbooks.',
    skills: ['payer sales', 'value-based care', 'enterprise sales', 'pricing'],
  },
  {
    fullName: 'Hassan Al-Mansoori',
    headline: 'Founder, Nabd Health',
    city: 'Dubai',
    cohort: 'OPM 50',
    industry: 'HealthTech',
    bio: 'Building AI-assisted diagnostics for primary clinics across the GCC. Familiar with DHA/MOH approvals, government healthcare tenders and partnering with regional hospital groups.',
    skills: ['diagnostics AI', 'GCC regulation', 'government tenders', 'partnerships'],
  },
  {
    fullName: 'Tomasz Wiśniewski',
    headline: 'Founder, FlowDesk',
    city: 'Warsaw',
    cohort: 'OPM 50',
    industry: 'B2B SaaS',
    bio: 'Bootstrapped a workflow automation tool to $4M ARR with a remote team of 30. Passionate about product-led growth, pricing experiments and keeping SaaS churn under 2% monthly.',
    skills: ['product-led growth', 'pricing', 'bootstrapping', 'churn reduction'],
  },
  {
    fullName: 'Emily Carter',
    headline: 'Chief Revenue Officer, Stackline',
    city: 'New York',
    cohort: 'OPM 52',
    industry: 'B2B SaaS',
    bio: 'Built outbound and partner-led sales motions for two venture-backed SaaS companies. Can coach founders on first sales hires, enterprise deal structuring and RevOps tooling.',
    skills: ['sales leadership', 'RevOps', 'enterprise deals', 'partnerships'],
  },
  {
    fullName: 'Jonas Becker',
    headline: 'Co-founder, Sentry Metrics',
    city: 'Berlin',
    cohort: 'OPM 48',
    industry: 'B2B SaaS',
    bio: 'Developer-tools founder with an observability product used by 3,000 engineering teams. Experienced in open-source community building, usage-based pricing and EU data-residency requirements.',
    skills: ['developer tools', 'open source', 'usage-based pricing', 'data residency'],
  },
  {
    fullName: 'Mei Lin Tan',
    headline: 'Founder, Corvo AI',
    city: 'Singapore',
    cohort: 'OPM 52',
    industry: 'B2B SaaS',
    bio: 'Runs an AI customer-support automation startup selling to APAC e-commerce brands. Knows LLM product design, evaluation, and landing enterprise pilots in Singapore and Indonesia.',
    skills: ['LLM products', 'AI evaluation', 'enterprise pilots', 'APAC sales'],
  },
  {
    fullName: 'Andriy Shevchenko',
    headline: 'CPO, Nimbus HR',
    city: 'Kyiv',
    cohort: 'OPM 50',
    industry: 'B2B SaaS',
    bio: 'Product leader running a distributed-team HR platform with Ukrainian engineering hubs. Great at remote product organisations, roadmap prioritisation and outsourcing-to-product transitions.',
    skills: ['product leadership', 'remote teams', 'roadmapping', 'HR tech'],
  },
  {
    fullName: 'Katarina Lindqvist',
    headline: 'Founder, Voltaris Energy',
    city: 'Berlin',
    cohort: 'OPM 50',
    industry: 'CleanTech',
    bio: 'Develops home battery and smart-energy management software for German households. Knows subsidy schemes, hardware supply chains and EU energy-market regulation.',
    skills: ['energy storage', 'hardware supply chain', 'EU subsidies', 'smart grid'],
  },
  {
    fullName: 'Oliver Grant',
    headline: 'Partner, GreenArc Capital',
    city: 'London',
    cohort: 'OPM 48',
    industry: 'CleanTech',
    bio: 'Climate-focused investor with a portfolio in carbon accounting, solar and grid software. Offers help with climate-tech fundraising narratives and project finance structures.',
    skills: ['climate investing', 'carbon accounting', 'project finance', 'fundraising'],
  },
  {
    fullName: 'Rohan Mehta',
    headline: 'CEO, SolarNest',
    city: 'Dubai',
    cohort: 'OPM 52',
    industry: 'CleanTech',
    bio: 'Installs and finances rooftop solar for commercial buildings across the UAE and Saudi Arabia. Strong in PPA contracts, government energy programmes and EPC contractor management.',
    skills: ['solar', 'PPA contracts', 'GCC energy', 'EPC management'],
  },
  {
    fullName: 'Ingrid Svensson',
    headline: 'Founder, CircuLoop',
    city: 'Singapore',
    cohort: 'OPM 50',
    industry: 'CleanTech',
    travelStatus: 'TRAVELING_TO',
    bio: 'Circular-economy startup turning industrial plastic waste into reusable packaging. Currently exploring manufacturing partners in Southeast Asia and ESG reporting for corporate buyers.',
    skills: ['circular economy', 'manufacturing', 'ESG reporting', 'sustainable packaging'],
  },
  {
    fullName: 'Victoria Ashworth',
    headline: 'Founder, Hearth Properties Tech',
    city: 'London',
    cohort: 'OPM 52',
    industry: 'Real Estate',
    bio: 'PropTech founder digitising lettings and tenant onboarding for UK landlords. Knows property data APIs, regulated agent compliance and B2B2C marketplace growth.',
    skills: ['PropTech', 'marketplaces', 'property data', 'compliance'],
  },
  {
    fullName: 'Piotr Zieliński',
    headline: 'Managing Director, UrbanGrid Development',
    city: 'Warsaw',
    cohort: 'OPM 48',
    industry: 'Real Estate',
    bio: 'Developed 1,200 residential and co-living units in Poland and the Baltics. Can discuss land acquisition, construction financing, ESG building standards and CEE investor relations.',
    skills: ['real estate development', 'construction finance', 'co-living', 'investor relations'],
  },
  {
    fullName: 'Fatima Al-Hashimi',
    headline: 'Director, Skyline Fractional',
    city: 'Dubai',
    cohort: 'OPM 50',
    industry: 'Real Estate',
    bio: 'Runs a fractional property investment platform regulated in the DIFC. Experienced in tokenisation, retail investor onboarding and cross-border property investment structures.',
    skills: ['fractional investing', 'DIFC regulation', 'tokenisation', 'investor onboarding'],
  },
  {
    fullName: 'Nikolai Petrenko',
    headline: 'Co-founder, RouteMind',
    city: 'Kyiv',
    cohort: 'OPM 52',
    industry: 'Logistics',
    bio: 'Builds route optimisation and fleet analytics software for last-mile delivery. Strong in operations research, telematics integrations and selling to European 3PLs.',
    skills: ['route optimisation', 'telematics', 'fleet analytics', '3PL sales'],
  },
  {
    fullName: 'Sarah Nguyen',
    headline: 'COO, PortBridge Freight',
    city: 'Singapore',
    cohort: 'OPM 48',
    industry: 'Logistics',
    bio: 'Runs a digital freight forwarding platform connecting Asian manufacturers with European retailers. Can advise on customs automation, container pricing volatility and carrier negotiations.',
    skills: ['freight forwarding', 'customs automation', 'carrier negotiation', 'supply chain'],
  },
  {
    fullName: 'Chloe Bennett',
    headline: 'Founder, ColdChain Labs',
    city: 'London',
    cohort: 'OPM 50',
    industry: 'Logistics',
    bio: 'Builds IoT temperature monitoring for pharmaceutical and food cold-chain shipments across Europe. Experienced with GDP compliance, sensor hardware partnerships and selling to global freight operators.',
    skills: ['cold chain', 'IoT', 'GDP compliance', 'hardware partnerships'],
  },
];

function embeddingText(p: SeedProfile): string {
  return `${p.fullName}. ${p.headline}. Industry: ${p.industry}. City: ${p.city}. ${p.cohort}. Skills: ${p.skills.join(', ')}. ${p.bio}`;
}

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Deterministic unit vector: hashed word tokens projected into 1536 dims (bag-of-words, so similar texts land close). */
function fallbackEmbedding(text: string): number[] {
  const v = new Array<number>(DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const token of tokens) {
    const h = createHash('sha256').update(token).digest();
    for (let i = 0; i < 4; i++) {
      const idx = h.readUInt16BE(i * 2) % DIMENSIONS;
      v[idx] += h[8 + i] % 2 === 0 ? 1 : -1;
    }
  }
  if (v.every((x) => x === 0)) v[0] = 1;
  return normalize(v);
}

async function openAiEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function generateEmbeddings(
  texts: string[],
): Promise<{ vectors: number[][]; source: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  // Ignore the placeholder value shipped in .env.example
  if (key && !key.startsWith('your-')) {
    try {
      const vectors = await openAiEmbeddings(texts, key);
      if (vectors.every((v) => v.length === DIMENSIONS))
        return { vectors, source: 'OpenAI text-embedding-3-small' };
      console.warn('Unexpected OpenAI embedding size, using fallback.');
    } catch (err) {
      console.warn(`OpenAI embedding failed (${(err as Error).message}); using fallback.`);
    }
  }
  return { vectors: texts.map(fallbackEmbedding), source: 'deterministic fallback' };
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

async function main() {
  const { vectors, source } = await generateEmbeddings(profiles.map(embeddingText));
  console.log(`Embeddings: ${source}`);

  // Password sign-in is enabled only when SEED_PASSWORD is set; every seeded alumnus shares it.
  const seedPassword = process.env.SEED_PASSWORD?.trim();
  const passwordHash = seedPassword ? await hashPassword(seedPassword) : null;
  console.log(
    passwordHash ? 'Password sign-in: enabled (SEED_PASSWORD)' : 'Password sign-in: disabled',
  );

  for (const [i, p] of profiles.entries()) {
    const email = `${slug(p.fullName)}@opm-alumni.example`;
    const linkedinUrl = `https://www.linkedin.com/in/${slug(p.fullName).replace(/\./g, '-')}`;
    const vector = `[${vectors[i].join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO "Profile" ("id","fullName","headline","bio","city","travelStatus","cohort","industry","skills","linkedinUrl","email","passwordHash","embedding","updatedAt")
      VALUES (gen_random_uuid()::text, ${p.fullName}, ${p.headline}, ${p.bio}, ${p.city},
              ${p.travelStatus ?? 'LIVING_IN'}::"TravelStatus", ${p.cohort}, ${p.industry}, ${p.skills},
              ${linkedinUrl}, ${email}, ${passwordHash}, ${vector}::vector, now())
      ON CONFLICT ("email") DO UPDATE SET
        "fullName"=EXCLUDED."fullName", "headline"=EXCLUDED."headline", "bio"=EXCLUDED."bio", "city"=EXCLUDED."city",
        "travelStatus"=EXCLUDED."travelStatus", "cohort"=EXCLUDED."cohort", "industry"=EXCLUDED."industry",
        "skills"=EXCLUDED."skills", "linkedinUrl"=EXCLUDED."linkedinUrl",
        "passwordHash"=COALESCE(EXCLUDED."passwordHash", "Profile"."passwordHash"), "embedding"=EXCLUDED."embedding", "updatedAt"=now()`;
  }

  const [{ total, embedded }] = await prisma.$queryRaw<{ total: bigint; embedded: bigint }[]>`
    SELECT count(*) AS total, count("embedding") AS embedded FROM "Profile"`;
  console.log(
    `Seeded ${profiles.length} profiles. DB now has ${total} profiles, ${embedded} with embeddings.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
