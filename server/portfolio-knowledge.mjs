import { companies } from '../src/data/experience.mjs'

const linkedin = 'https://www.linkedin.com/in/subhash-dixit-nit-durgapur/'
const experienceHref = '#experience'
const projectFacts = [
  ['invoice-extraction', 'Invoice Extraction Studio', 'Extracts structured invoice fields, runs OCR in the browser, and checks whether totals reconcile. The optional local AI uses Transformers.js and ONNX Runtime Web.', 'invoice-extraction-studio'],
  ['energy-forecast', 'Energy Forecast Explorer', 'Uses historical hourly readings to forecast daily average energy and compares weekly naive, smoothing, and Prophet on later observations. The weekly-naive model was selected.', 'energy-demand-forecaster'],
  ['credit-risk', 'Credit Risk Classifier', 'Predicts four historical credit categories from 14 inputs. The selected random forest achieved 72.28% accuracy and 0.667 macro F1 on the held-out dataset.', 'credit-risk-classifier'],
  ['equity-research', 'Equity Research Assistant', 'Ranks financial-document excerpts with BM25 and optionally generates answers with an on-device model. The cited excerpts can be checked in the app.', 'equity-research-assistant'],
  ['churn', 'Customer Churn Explorer', 'Uses an offline-trained random forest and browser inference to explore historical bank churn. Held-out accuracy was 81.85% and churn recall was 67.7%.', 'customer-churn-explorer'],
  ['restaurant-review', 'Restaurant Review Classifier', 'Classifies restaurant review sentiment using a portable TF-IDF and Naive Bayes model. On the held-out Yelp sentences, accuracy was 68.50% and macro F1 was about 0.683.', 'restaurant-review-classifier'],
  ['forecasting-lab', 'Time Series Forecasting Lab', 'Compares forecasting methods using time-ordered validation on monthly confectionery production and quarterly news demand. It also supports dated user CSVs, such as sales observations.', 'time-series-forecasting-lab'],
  ['whatsapp', 'WhatsApp Conversation Explorer', 'Parses WhatsApp text exports locally, reports parser coverage and activity, and analyzes sessions and adjacent speaker transitions. It exports alias-level aggregate counts.', 'whatsapp-conversation-explorer'],
]

const careerRoles = companies.flatMap(company => company.roles.map((role, index) => ({
  id: `career-${company.logo}-${index + 1}`,
  title: `${role.title} at ${company.name}`,
  text: `Subhash Dixit worked as ${role.title} at ${company.name} (${role.period}) in ${company.location}. ${role.description} ${role.achievements.join(' ')}`,
  href: experienceHref,
})))

const profile = {
  id: 'profile',
  title: 'About Subhash Dixit',
  text: 'Subhash Dixit is a Senior Data Scientist at EPAM Systems. His experience spans forecasting, predictive modeling, pricing, customer analytics, natural language processing, and business analytics. His previous employers include WNS Analytics, Affine Analytics, and Tata Consultancy Services.',
  href: '#home',
}

export const portfolioKnowledge = [
  profile,
  {
    id: 'linkedin-about',
    title: 'LinkedIn About and professional interests',
    text: 'Subhash describes his work as turning business questions into forecasting, pricing, and customer analytics solutions across consumer goods, gaming, and analytics consulting. He works across problem definition, data preparation, model evaluation, and delivery. He has used Python, SQL, PySpark, scikit-learn, XGBoost, Databricks, AWS, Flask, Streamlit, Docker, GitHub Actions, Transformers.js, and ONNX Runtime Web. His independent practice projects include document question answering, local LLM inference, summarization, invoice OCR, and source-linked research. He is continuing to deepen his knowledge of RAG, LangChain, LangGraph, and agent workflows. He is open to discussing relocation for data science, machine learning, and applied AI roles in Europe, the United States, the UAE, and Australia.',
    href: linkedin,
  },
  {
    id: 'education',
    title: 'Education at NIT Durgapur',
    text: 'Subhash earned a B.Tech in Civil Engineering from the National Institute of Technology Durgapur from 2017 to 2021. His résumé and LinkedIn list a CGPA of 8.71 out of 10.',
    href: linkedin,
  },
  {
    id: 'professional-skills',
    title: 'Skills and tools',
    text: 'Subhash’s résumé lists Python, SQL, statistical modeling, time-series forecasting, regression, clustering, price elasticity, promotion modeling, experiment analysis, sentiment analysis, and data validation. His experience includes Prophet, ARIMA and SARIMA, K-means, VADER, n-grams, Looker, Databricks, AWS, Docker, Git, and CI/CD.',
    href: '#experience',
  },
  {
    id: 'recognition',
    title: 'Professional recognition',
    text: 'Subhash lists recognition for delivery and innovation at EPAM Systems and a Transformer of the Month award at Affine Analytics in January 2023. His LinkedIn also lists advanced regression training at IIM Bangalore in March 2025.',
    href: linkedin,
  },
  {
    id: 'professional-learning',
    title: 'Certifications and professional learning',
    text: 'Subhash’s résumé lists the iNeuron Full Stack Data Science Bootcamp, Databricks Machine Learning Professional, and Claude Certified Architect certification. His LinkedIn lists the bootcamp and advanced regression training at IIM Bangalore.',
    href: linkedin,
  },
  {
    id: 'career-ineuron-internship',
    title: 'Project internship at iNeuron.ai',
    text: 'Subhash’s LinkedIn lists a project internship at iNeuron.ai from December 2022 to January 2023. He worked on an insurance-premium regression project with a Streamlit interface and an AWS and GitHub Actions deployment workflow.',
    href: linkedin,
  },
  ...careerRoles,
  ...projectFacts.map(([id, title, text, slug]) => ({
    id,
    title,
    text,
    href: `https://github.com/subhashdixit/${slug}`,
  })),
]

function source({ id, title, href }) {
  return { id, title, href }
}

export function findPortfolioFact(question) {
  const normalized = question.trim().replace(/[?.!]+$/, '')
  if (/^(?:who is|tell me about) subhash(?: dixit)?$/i.test(normalized)) {
    return { answer: profile.text, sources: [source(profile)] }
  }

  if (/^(?:which (?:company|employer|organization)|where)\b/i.test(normalized) && /\b(?:youtube|pre[- ]launch sentiment)\b/i.test(normalized)) {
    const role = careerRoles.find(item => item.id === 'career-affine-1')
    return {
      answer: 'Subhash built the pre-launch YouTube sentiment analysis platform at Affine Analytics as a Senior Associate Data Scientist.',
      sections: [{ heading: 'What it did', text: companies.find(company => company.logo === 'affine').roles[0].achievements[0] }],
      sources: [source(role)],
    }
  }

  const employer = normalized.match(/^what (?:did|does) (?:you|subhash|he) (?:build|do|work on) (?:at|for) (.+)$/i)?.[1]
  if (!employer) return null
  const aliases = { epam: 'epam', wns: 'wns', affine: 'affine', tcs: 'tcs' }
  const name = employer.toLowerCase()
  const company = companies.find(item => item.name.toLowerCase() === name || item.logo === aliases[name])
  if (!company) return null

  const roles = careerRoles.filter(role => role.id.startsWith(`career-${company.logo}-`))
  return {
    answer: `At ${company.name}, Subhash worked as ${company.roles.map(role => role.title).join(' and ')}.`,
    sections: company.roles.map(role => ({
      heading: role.title,
      text: `${role.description} ${role.achievements[0]}`,
    })),
    sources: roles.map(source),
  }
}
