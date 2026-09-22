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
    [{ resize: { width: targetWidth, height: targetHeight } }],
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
const OPENAI_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a nutrition estimator for a calorie tracking app.
Estimate the nutrition of the meal you are given and return ONE consolidated entry for the whole meal.
Respond with JSON only, using exactly this shape:
{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "servingSize": number, "servingUnit": "g" | "ml"}
- name: a short description of the whole meal (e.g. "Roasted lamb with potatoes and a bread roll")
- protein, carbs, fat: total grams for the whole meal
- servingSize: total estimated weight (g) or volume (ml) of the meal
- Include cooking oils, butter, sauces and dressings in your estimate.`;

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
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('OPENAI_API_KEY_INVALID');
    if (response.status === 429) throw new Error('OPENAI_RATE_LIMITED');
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const estimatedFood: EstimatedFood = JSON.parse(content);

  if (
    !estimatedFood.name ||
    typeof estimatedFood.protein !== 'number' ||
    typeof estimatedFood.carbs !== 'number' ||
    typeof estimatedFood.fat !== 'number' ||
    typeof estimatedFood.servingSize !== 'number' ||
    !['g', 'ml'].includes(estimatedFood.servingUnit)
  ) {
    throw new Error('Invalid response format from OpenAI');
  }

  // Always derive calories from macros so the numbers are consistent
  estimatedFood.calories = Math.round(
    estimatedFood.protein * 4 + estimatedFood.carbs * 4 + estimatedFood.fat * 9
  );

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
      {
        type: 'text',
        text: `Estimate the nutrition of the food in this photo.${
          userContext ? ` The user says: ${userContext}` : ''
        }`,
      },
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Image}` },
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
    return await requestEstimate(
      `Estimate the nutrition of this meal: ${description.trim()}${
        userContext ? `
Additional context: ${userContext}` : ''
      }`
    );
  } catch (error) {
    console.error('Error analyzing food description:', error);
    throw toFriendlyError(error, 'Failed to analyze description. Please try again.');
  }
}
