# Calorie & Weight Tracker App

A React Native app built with Expo for tracking daily food intake and weight progress.

## Features

### Dashboard
- View today's total calories vs. target
- See personalized calorie and macro recommendations
- Track current weight and TDEE (Total Daily Energy Expenditure)
- View adaptive TDEE estimate with confidence score
- See 7-day average calorie intake
- Visualize calories consumed over the last 7 days with a line chart
- Monitor weight trends with a weight chart
- Quick access to log weight from the dashboard
- Real-time progress tracking toward daily calorie goals

### Food Journal
- Navigate between different dates
- View all food entries for a selected day
- See daily summary of calories and macronutrients (protein, carbs, fat)
- Add new food entries with detailed nutritional information
- Delete unwanted entries
- View entry timestamps

### Add Food Entry
- **Four input methods:**
  - **Manual Entry**: Enter food name, calories, and optional macronutrients
  - **Search Database**: Search database for common whole foods
  - **Barcode Scanner**: Scan product barcodes to automatically lookup nutritional information
  - **AI Photo Analysis**: Take a photo and let AI identify and log your foods automatically
- Barcode scanning uses the Open Food Facts API for product data
- Food search uses the USDA FoodData Central API
- AI photo analysis uses OpenAI GPT-4 Vision to identify foods and quantities
- Scanned and searched values can be edited before saving
- Nutritional values shown per 100g for scanned/searched products
- Entries are automatically timestamped and dated

### Log Weight
- Quick weight logging
- Weight entries are tracked by date
- View weight trends on the dashboard
- Weight data is used to calculate adaptive TDEE

### Goals & Profile
- Set your biological sex, birth date, and height
- Choose your activity level (sedentary to extremely active)
- Set your weight goal (lose, maintain, or gain)
- Define target weight and rate of change (lbs per week)
- Profile is used to calculate personalized calorie and macro recommendations
- Adaptive algorithm learns from your tracking data to provide accurate TDEE estimates

## Tech Stack

- **Expo Router** - File-based navigation
- **React Native** - Mobile app framework
- **react-native-chart-kit** - Data visualization with charts
- **react-native-svg** - SVG support for charts
- **expo-camera / expo-barcode-scanner** - Barcode scanning functionality
- **expo-image-picker** - Camera and photo library access
- **Open Food Facts API** - Product nutritional information lookup
- **OpenAI GPT-4 Vision API** - AI-powered food identification from photos
- **TypeScript** - Type safety

## Project Structure

```
TODO
```

## Data Storage

All data is stored locally on the device:
- **Food Entries**: Stored with date, name, calories, and optional macronutrients
- **Weight Entries**: Stored with date and weight value

## Navigation

The app uses Expo Router with:
- **Bottom Tabs**: Dashboard and Food Journal
- **Modals**: Add Food Entry and Log Weight (presented as modal screens)

## How Barcode Scanning Works

1. When adding food, select "Scan Barcode"
2. Grant camera permissions if prompted
3. Position a product barcode within the scanning frame
4. The app queries the Open Food Facts database
5. If found, nutritional information is automatically populated
6. Values can be edited before saving
7. If not found, you can enter information manually

**Note**: Barcode scanning requires camera permissions and internet connectivity to lookup products.

## How AI Photo Analysis Works

TODO

## How Adaptive TDEE Works

The app uses an intelligent algorithm to estimate your Total Daily Energy Expenditure (TDEE):

1. **Initial Estimate**: Uses the Mifflin-St Jeor equation based on your profile (sex, age, height, weight, activity level)
2. **Data Collection**: As you log food and weight, the app calculates an inferred TDEE from actual weight changes
3. **Adaptive Blending**: The app blends formula-based and data-inferred estimates:
   - Days 1-7: 100% formula (collecting data)
   - Days 7-28: Gradual transition from 80/20 to 50/50 to 20/80 (formula/data)
   - Day 28+: 20% formula, 80% data (mature estimate)
4. **Confidence Scoring**: The app tracks data quality and provides a confidence score
5. **Smart Smoothing**: Daily TDEE changes are capped to prevent wild swings from noisy data

**Key Formulas**:
- BMR (Mifflin-St Jeor): `10 × weight(kg) + 6.25 × height(cm) - 5 × age + sex_constant`
- TDEE: `BMR × activity_multiplier`
- Inferred TDEE: `avg_daily_intake + (weight_change_lbs_per_week × 500)`
- Target Calories: `TDEE + (goal_rate × 3500 / 7)`

## Features to Add (Future)


