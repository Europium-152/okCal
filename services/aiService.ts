import * as ImageManipulator from 'expo-image-manipulator';
import { getOpenAIApiKey } from '@/utils/storage';

/**
 * Result from AI photo analysis - a single consolidated food entry
 */
export interface EstimatedFood {
  name: string; // e.g., "Roasted lamb with potatoes, a glass of wine, and a bread roll"
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  servingSize: number; // grams or ml
  servingUnit: 'g' | 'ml';
}

/**
 * Resize image to 1024x768 (landscape) or 768x1024 (portrait) to save tokens and bandwidth
 * @param uri Original image URI
 * @returns URI of resized image
 */
async function resizeImage(uri: string): Promise<string> {
  // Get image dimensions to determine orientation
  const image = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { format: ImageManipulator.SaveFormat.JPEG }
  );

  const { width, height } = image;
  const isLandscape = width > height;

  // Calculate resize dimensions maintaining aspect ratio
  const targetWidth = isLandscape ? 1024 : 768;
  const targetHeight = isLandscape ? 768 : 1024;

  // Only resize if image is larger than target
  if (width <= targetWidth && height <= targetHeight) {
    console.log(`Image already optimal size: ${width}x${height}`);
    return uri;
  }

  console.log(`Resizing image from ${width}x${height} to ${targetWidth}x${targetHeight}`);

  const resizedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: isLandscape ? { width: targetWidth } : { height: targetHeight } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  return resizedImage.uri;
}

/**
 * Convert image URI to base64
 */
async function imageToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4.1-mini';

const JSON_SUMMARY_SPEC = `5. JSON nutrition summary formatted as single json object at the end of your answer, json_summary = {
  "name": "Descriptive name of the complete meal/food",
  "calories": total_calories_as_number,
  "protein": total_protein_grams_as_number,
  "carbs": total_carbs_grams_as_number,
  "fat": total_fat_grams_as_number,
  "servingSize": total_weight_or_volume_as_number,
  "servingUnit": "g" or "ml"
}`;

function buildImagePrompt(userContext?: string): string {
  let prompt = `Analyze this food image and provide a detailed calorie estimation. Be specific and detailed in your analysis. Include:
1. Food items identified with specificity
2. Estimated portion sizes in grams
3. Calorie and macro nutrient breakdown by ingredient
4. Total estimated calories and total estimated macro nutrients
${JSON_SUMMARY_SPEC}`;
  if (userContext) prompt += `\n\nHint: ${userContext}`;
  return prompt;
}

function buildTextPrompt(description: string, userContext?: string): string {
  let prompt = `Analyze this meal description and provide a detailed calorie estimation. Be specific and detailed in your analysis. Include:
1. Food items identified from the description with specificity
2. Estimated portion sizes in grams based on typical serving sizes
3. Calorie and macro nutrient breakdown by ingredient
4. Total estimated calories and total estimated macro nutrients
${JSON_SUMMARY_SPEC}

Meal description: "${description}"`;
  if (userContext) prompt += `\n\nHint: ${userContext}`;
  return prompt;
}

/**
 * Extract the json_summary from the model's free-text analysis.
 * Tries a fenced json block, then `json_summary = {...}`, then a bare object,
 * then falls back to regex extraction of individual fields.
 */
function parseNutrition(text: string): Partial<EstimatedFood> {
  const match =
    text.match(/```json\s*(\{.*?\})\s*```/s) ||
    text.match(/json_summary\s*=\s*(\{[^}]+\})/s) ||
    text.match(/\{[^{}]*"name"[^{}]*"calories"[^{}]*\}/s);

  if (match) {
    try {
      return JSON.parse(match[1] || match[0]);
    } catch {
      // fall through to manual extraction
    }
  }

  const num = (key: string) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*(\\d+\\.?\\d*)`));
    return m ? parseFloat(m[1]) : 0;
  };
  return {
    name: text.match(/"name"\s*:\s*"([^"]+)"/)?.[1] || 'Unknown',
    calories: num('calories'),
    protein: num('protein'),
    carbs: num('carbs'),
    fat: num('fat'),
    servingSize: num('servingSize'),
    servingUnit: (text.match(/"servingUnit"\s*:\s*"([^"]+)"/)?.[1] as 'g' | 'ml') || 'g',
  };
}

async function requestEstimate(
  userContent: string | object[]
): Promise<EstimatedFood> {
  const apiKey = await getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('OPENAI_API_KEY_INVALID');
    if (response.status === 429) throw new Error('OPENAI_RATE_LIMITED');
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content: string | undefined = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Invalid response format from OpenAI');
  }
  const parsed = parseNutrition(content);

  const estimatedFood: EstimatedFood = {
    name: parsed.name || 'Unknown',
    calories: Number(parsed.calories) || 0,
    protein: Number(parsed.protein) || 0,
    carbs: Number(parsed.carbs) || 0,
    fat: Number(parsed.fat) || 0,
    servingSize: Number(parsed.servingSize) || 0,
    servingUnit: parsed.servingUnit === 'ml' ? 'ml' : 'g',
  };

  if (estimatedFood.name === 'Unknown' && !estimatedFood.calories) {
    throw new Error('Invalid response format from OpenAI');
  }

  // Always derive calories from macros so the numbers are consistent
  if (estimatedFood.protein || estimatedFood.carbs || estimatedFood.fat) {
    estimatedFood.calories = Math.round(
      estimatedFood.protein * 4 + estimatedFood.carbs * 4 + estimatedFood.fat * 9
    );
  }

  return estimatedFood;
}

function toFriendlyError(error: unknown, fallback: string): Error {
  const message = error instanceof Error ? error.message : '';
  if (message === 'OPENAI_API_KEY_MISSING') {
    return new Error('Add your OpenAI API key in Settings to use AI logging.');
  }
  if (message === 'OPENAI_API_KEY_INVALID') {
    return new Error('OpenAI rejected your API key. Check it in Settings.');
  }
  if (message === 'OPENAI_RATE_LIMITED') {
    return new Error('OpenAI rate limit or quota reached. Check your OpenAI account.');
  }
  return new Error(fallback);
}

/**
 * Analyze a food photo with OpenAI, using the user's own API key
 * @param imageUri Local URI of the food image
 * @param userContext Optional hint provided by the user
 */
export async function processFoodImage(
  imageUri: string,
  userContext?: string
): Promise<EstimatedFood> {
  try {
    const resizedUri = await resizeImage(imageUri);
    const base64Image = await imageToBase64(resizedUri);

    return await requestEstimate([
      { type: 'text', text: buildImagePrompt(userContext) },
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
      },
    ]);
  } catch (error) {
    console.error('Error analyzing food image:', error);
    throw toFriendlyError(error, 'Failed to analyze image. Please try again.');
  }
}

/**
 * Analyze a text description of a meal with OpenAI, using the user's own API key
 * @param description User's text description of their meal
 * @param userContext Optional additional context/hint
 */
export async function processFoodDescription(
  description: string,
  userContext?: string
): Promise<EstimatedFood> {
  try {
    return await requestEstimate(buildTextPrompt(description.trim(), userContext));
  } catch (error) {
    console.error('Error analyzing food description:', error);
    throw toFriendlyError(error, 'Failed to analyze description. Please try again.');
  }
}
