import type {
  AuthResponse,
  SkinAnalysis,
  Recommendation,
  UserProfile,
  HistoricalProgressEntry,
  User,
} from '../types';

// Helper for realistic network delay simulation
const delay = (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEY_AUTH = 'dermasense_auth_user';
const STORAGE_KEY_PROFILE = 'dermasense_user_profile';
const STORAGE_KEY_ANALYSIS = 'dermasense_latest_analysis';
const STORAGE_KEY_RECOMMENDATION = 'dermasense_latest_recommendation';
const STORAGE_KEY_HISTORY = 'dermasense_progress_history';

// Default mock user profile
const defaultProfile: UserProfile = {
  skinType: 'combination',
  sensitivity: 'medium',
  allergies: ['Salicylic Acid (High Conc.)'],
  goals: ['Reduce Acne', 'Improve Texture', 'Hydration'],
};

// Default mock analysis (matching exact backend specification)
const defaultAnalysis: SkinAnalysis = {
  detectedIssues: [
    { issue: 'Acne', present: true, confidence: 0.87, severity: 'high' },
    { issue: 'Dark Circles', present: false, confidence: 0.12, severity: 'none' },
    { issue: 'Pigmentation', present: true, confidence: 0.65, severity: 'medium' },
    { issue: 'Blackheads', present: true, confidence: 0.72, severity: 'low' },
    { issue: 'Wrinkles', present: false, confidence: 0.08, severity: 'none' },
  ],
  poresDetected: [
    { region: 'Left Cheek', present: true, confidence: 0.88, severity: 'high' },
    { region: 'Forehead', present: true, confidence: 0.75, severity: 'medium' },
    { region: 'Right Cheek', present: true, confidence: 0.82, severity: 'high' },
    { region: 'Jaw', present: false, confidence: 0.15, severity: 'none' },
  ],
  skinType: 'combination',
  skinScore: 82,
  subscores: {
    acne: 90,
    pigmentation: 80,
    darkCircles: 100,
    wrinkles: 100,
    texture: 82,
    oilBalance: 100,
  },
};

// Default mock recommendation (matching exact backend specification)
const defaultRecommendation: Recommendation = {
  routine: {
    morning: ['Gentle Hydrating Cleanser', 'Niacinamide 10% Serum', 'Broad Spectrum SPF 50 Sunscreen'],
    night: ['Foaming Cleanser', 'Hyaluronic Acid Serum', 'Barrier Repair Moisturizer'],
    weekly: ['Gentle AHA/BHA Exfoliating Scrub (2x/week)'],
  },
  explanation:
    'Based on your AI scan showing localized cheek pores and active acne, your morning routine focuses on oil control and sunscreen barrier protection. The night routine prioritizes cell repair and deep hydration.',
  insights: [
    'Your skin barrier shows high resilience in dark circle and wrinkle subscores.',
    'Oil balance is optimal on the jaw region, but T-zone requires gentle pore management.',
    'UV exposure protection recommended given mild pigmentation on cheeks.',
  ],
};

// Default mock historical progress (last 30 days)
const generateMockHistory = (): HistoricalProgressEntry[] => {
  const history: HistoricalProgressEntry[] = [];
  const now = new Date();
  const baseScores = [68, 70, 72, 71, 75, 74, 78, 76, 80, 82];
  
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 3);
    const score = baseScores[9 - i];
    history.push({
      date: d.toISOString().split('T')[0],
      skinScore: score,
      subscores: {
        acne: Math.min(100, score + 8),
        pigmentation: Math.min(100, score - 2),
        darkCircles: 95,
        wrinkles: 98,
        texture: score,
        oilBalance: Math.min(100, score + 10),
      },
      notes: i === 0 ? 'Latest AI Scan' : `Routine check-in ${10 - i}`,
    });
  }
  return history;
};

/* =========================================================================
   API Client Functions (Single module touching mock or real backend endpoints)
   ========================================================================= */

// 1. Auth: POST /api/auth/register
export async function registerApi(name: string, email: string, password: string): Promise<AuthResponse> {
  await delay(600);
  if (!email.includes('@') || password.length < 6) {
    throw new Error('Invalid email or password must be at least 6 characters.');
  }

  const user: User = { id: `usr_${Date.now()}`, name, email };
  const authRes: AuthResponse = { token: `mock_jwt_token_${Date.now()}`, user };

  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authRes));
  return authRes;
}

// 2. Auth: POST /api/auth/login
export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  await delay(600);
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  if (password === 'fail') {
    throw new Error('Invalid credentials. Please try again.');
  }

  const user: User = {
    id: 'usr_demo_123',
    name: email.split('@')[0].toUpperCase() || 'Tasmiya',
    email,
  };
  const authRes: AuthResponse = { token: 'mock_jwt_token_demo', user };

  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authRes));
  return authRes;
}

// Auth logout
export async function logoutApi(): Promise<void> {
  await delay(200);
  localStorage.removeItem(STORAGE_KEY_AUTH);
}

// Auth Check Saved Session
export function getSavedAuthSession(): AuthResponse | null {
  const data = localStorage.getItem(STORAGE_KEY_AUTH);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 3. User Profile: GET /api/users/me/profile
export async function getUserProfileApi(): Promise<UserProfile> {
  await delay(400);
  const data = localStorage.getItem(STORAGE_KEY_PROFILE);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  return defaultProfile;
}

// User Profile: PUT /api/users/me/profile
export async function updateUserProfileApi(profile: UserProfile): Promise<UserProfile> {
  await delay(500);
  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  return profile;
}

// 4. AI Analysis: POST /api/ai/analyze (Calls live FastAPI AI service, falls back gracefully)
export async function analyzeSkinImageApi(file: File): Promise<{
  analysis: SkinAnalysis;
  recommendation: Recommendation;
}> {
  if (!file || file.size === 0) {
    throw new Error('Please select a valid face photo file.');
  }

  let analysis: SkinAnalysis;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://127.0.0.1:8000/api/ai/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    analysis = await response.json();
  } catch (err) {
    console.warn('Real AI Service call failed or unreachable, falling back to simulated inference:', err);
    await delay(1200);
    const randomScoreBonus = Math.floor(Math.random() * 6) - 2;
    const newScore = Math.min(98, Math.max(65, 82 + randomScoreBonus));
    analysis = {
      ...defaultAnalysis,
      skinScore: newScore,
      subscores: {
        ...defaultAnalysis.subscores,
        texture: Math.min(100, 80 + randomScoreBonus * 2),
        acne: Math.min(100, 88 + randomScoreBonus),
      },
    };
  }

  // Dynamic Personalized Recommendation based on real AI results
  const morningRoutine: string[] = [];
  const nightRoutine: string[] = [];
  const weeklyRoutine: string[] = [];
  const insights: string[] = [];

  // Base routine by skin type
  if (analysis.skinType === 'oily') {
    morningRoutine.push('Foaming Salicylic Acid Gel Cleanser', 'Oil-Free Mattifying Gel Moisturizer', 'Broad Spectrum Ultra-Light SPF 50');
    nightRoutine.push('Double Cleansing Oil + Foam', 'Niacinamide 10% + Zinc 1% Serum', 'Lightweight Barrier Cream');
    weeklyRoutine.push('Clay Pore Detox Mask (2x/week)');
    insights.push('High sebum activity detected. Oil-free and pore-clarifying active ingredients recommended.');
  } else if (analysis.skinType === 'dry') {
    morningRoutine.push('Hydrating Ceramide Milky Cleanser', 'Hyaluronic Acid 2% + B5 Serum', 'Rich Nourishing Day Cream SPF 50');
    nightRoutine.push('Gentle Cream Cleanser', 'Barrier Repair Peptide Complex', 'Intense Overnight Lipid Balm');
    weeklyRoutine.push('Hydrating Honey / Centella Sheet Mask (2x/week)');
    insights.push('Moisture barrier deficit observed. Emollients and humectants prioritized to lock in deep hydration.');
  } else {
    morningRoutine.push('Gentle Balancing Cleanser', 'Vitamin C 10% Brightening Serum', 'Daily Hydrating Sunscreen SPF 50');
    nightRoutine.push('Micellar / Gentle Gel Cleanser', 'Multi-Hyaluronic Serum', 'Ceramide Night Moisturizer');
    weeklyRoutine.push('Gentle Lactic Acid / PHA Exfoliant (1-2x/week)');
    insights.push('Balanced moisture-to-lipid ratio. Standard preventive and protective regimen maintained.');
  }

  // Target detected issues
  const activeIssues = analysis.detectedIssues.filter((i) => i.present);
  if (activeIssues.some((i) => i.issue === 'Acne')) {
    nightRoutine.splice(1, 0, 'Targeted 2% BHA Spot Treatment');
    insights.push('Active acne blemishes detected. Spot treatment added to evening routine.');
  }
  if (activeIssues.some((i) => i.issue === 'Pigmentation')) {
    morningRoutine.splice(1, 0, 'Tranexamic Acid / Alpha Arbutin Brightening Serum');
    insights.push('Mild localized sun spots / pigmentation identified. UV defense & brightening serum reinforced.');
  }
  if (activeIssues.some((i) => i.issue === 'Wrinkles')) {
    nightRoutine.splice(1, 0, 'Encapsulated 0.3% Retinol Regenerating Serum');
    insights.push('Fine lines & elasticity drop noted. Nighttime cell-turnover booster recommended.');
  }

  const explanation = `Your AI scan evaluated your skin as ${analysis.skinType.toUpperCase()} with an overall skin score of ${analysis.skinScore}/100. ` +
    (activeIssues.length > 0
      ? `Primary focus areas: ${activeIssues.map((i) => `${i.issue} (${i.severity} severity)`).join(', ')}.`
      : 'Your skin parameters are resilient and well-balanced.');

  const recommendation: Recommendation = {
    routine: {
      morning: morningRoutine,
      night: nightRoutine,
      weekly: weeklyRoutine,
    },
    explanation,
    insights,
  };

  localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(analysis));
  localStorage.setItem(STORAGE_KEY_RECOMMENDATION, JSON.stringify(recommendation));

  // Append entry to history
  const history = await getHistoricalProgressApi();
  const todayStr = new Date().toISOString().split('T')[0];
  const updatedHistory = [
    ...history.filter((h) => h.date !== todayStr),
    {
      date: todayStr,
      skinScore: analysis.skinScore,
      subscores: analysis.subscores,
      notes: `AI Scan (${analysis.skinType}) - Score ${analysis.skinScore}`,
    },
  ];
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

  return { analysis, recommendation };
}

// Get Latest Saved Analysis
export async function getLatestAnalysisApi(): Promise<{
  analysis: SkinAnalysis;
  recommendation: Recommendation;
}> {
  await delay(300);
  const analysisData = localStorage.getItem(STORAGE_KEY_ANALYSIS);
  const recData = localStorage.getItem(STORAGE_KEY_RECOMMENDATION);

  const analysis = analysisData ? JSON.parse(analysisData) : defaultAnalysis;
  const recommendation = recData ? JSON.parse(recData) : defaultRecommendation;

  return { analysis, recommendation };
}

// 5. Progress History: GET /api/analytics/progress
export async function getHistoricalProgressApi(): Promise<HistoricalProgressEntry[]> {
  await delay(400);
  const data = localStorage.getItem(STORAGE_KEY_HISTORY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  const initialHistory = generateMockHistory();
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(initialHistory));
  return initialHistory;
}
