import { parseMacroFactorCSV } from '../csvParser';

describe('csvParser', () => {
  describe('parseMacroFactorCSV', () => {
    it('should parse valid CSV with all columns', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Chicken Breast,1,100,165,3.6,0,31
2024-03-15,06:00 PM,Rice,2,200,260,0.6,57,5.3`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-03-15',
        time: '12:30 PM',
        foodName: 'Chicken Breast',
        servingQty: 1,
        servingWeight: 100,
        calories: 165,
        fat: 3.6,
        carbs: 0,
        protein: 31,
      });
      expect(result[1]).toEqual({
        date: '2024-03-15',
        time: '06:00 PM',
        foodName: 'Rice',
        servingQty: 2,
        servingWeight: 200,
        calories: 260,
        fat: 0.6,
        carbs: 57,
        protein: 5.3,
      });
    });

    it('should handle alternative column names', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight,Calories,Fat,Carbs,Protein
2024-03-15,12:30 PM,Chicken,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toBe('Chicken');
    });

    it('should handle quoted values with commas', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,"Chicken, grilled",1,100,165,3.6,0,31
2024-03-15,06:00 PM,"Rice, white",2,200,260,0.6,57,5.3`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].foodName).toBe('Chicken, grilled');
      expect(result[1].foodName).toBe('Rice, white');
    });

    it('should handle food names with quotes', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,"Chicken ""Homestyle""",1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toContain('Chicken');
    });

    it('should skip rows with invalid date format', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
03/15/2024,12:30 PM,Invalid Date,1,100,165,3.6,0,31
2024-03-15,12:30 PM,Valid Date,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toBe('Valid Date');
    });

    it('should skip empty lines', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Food 1,1,100,165,3.6,0,31

2024-03-15,06:00 PM,Food 2,2,200,260,0.6,57,5.3
`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
    });

    it('should handle rows with insufficient columns', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Incomplete
2024-03-15,06:00 PM,Complete,2,200,260,0.6,57,5.3`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toBe('Complete');
    });

    it('should handle missing numeric values with defaults', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Food,,,,,,`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].servingQty).toBe(0);
      expect(result[0].servingWeight).toBe(0);
      expect(result[0].calories).toBe(0);
      expect(result[0].fat).toBe(0);
      expect(result[0].carbs).toBe(0);
      expect(result[0].protein).toBe(0);
    });

    it('should handle decimal values', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Food,1.5,125.5,165.7,3.6,0.5,31.2`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].servingQty).toBe(1.5);
      expect(result[0].servingWeight).toBe(125.5);
      expect(result[0].calories).toBe(165.7);
      expect(result[0].fat).toBe(3.6);
      expect(result[0].carbs).toBe(0.5);
      expect(result[0].protein).toBe(31.2);
    });

    it('should throw error for empty CSV', () => {
      expect(() => parseMacroFactorCSV('')).toThrow();
    });

    it('should throw error for missing required columns', () => {
      const csv = `Date,Time,Food Name
2024-03-15,12:30 PM,Food`;

      expect(() => parseMacroFactorCSV(csv)).toThrow('Missing required column');
    });

    it('should throw error for missing Date column', () => {
      const csv = `Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
12:30 PM,Food,1,100,165,3.6,0,31`;

      expect(() => parseMacroFactorCSV(csv)).toThrow('Missing required column: Date');
    });

    it('should throw error for missing Time column', () => {
      const csv = `Date,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,Food,1,100,165,3.6,0,31`;

      expect(() => parseMacroFactorCSV(csv)).toThrow('Missing required column: Time');
    });

    it('should throw error for missing Food Name column', () => {
      const csv = `Date,Time,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,1,100,165,3.6,0,31`;

      expect(() => parseMacroFactorCSV(csv)).toThrow('Missing required column: Food Name');
    });

    it('should handle CSV with only headers', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toEqual([]);
    });

    it('should handle multiple entries on same date', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,08:00 AM,Breakfast,1,100,200,5,20,10
2024-03-15,12:00 PM,Lunch,1,150,300,10,30,15
2024-03-15,06:00 PM,Dinner,1,200,400,15,40,20`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(3);
      expect(result.every(r => r.date === '2024-03-15')).toBe(true);
    });

    it('should handle zero values', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Zero Calorie Food,0,0,0,0,0,0`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].calories).toBe(0);
    });

    it('should handle negative values (though unusual)', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Food,-1,-100,-165,-3.6,0,-31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].servingQty).toBe(-1);
    });

    it('should handle special characters in food names', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,"Food & Drink",1,100,165,3.6,0,31
2024-03-15,06:00 PM,"Food @ Place",2,200,260,0.6,57,5.3`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].foodName).toBe('Food & Drink');
      expect(result[1].foodName).toBe('Food @ Place');
    });

    it('should trim whitespace from values', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
 2024-03-15 , 12:30 PM , Food With Spaces ,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-03-15');
      expect(result[0].time).toBe('12:30 PM');
      expect(result[0].foodName).toBe('Food With Spaces');
    });

    it('should handle different date formats within valid YYYY-MM-DD', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-01-05,12:30 PM,Food 1,1,100,165,3.6,0,31
2024-12-25,12:30 PM,Food 2,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-05');
      expect(result[1].date).toBe('2024-12-25');
    });

    it('should handle very large numeric values', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Huge Meal,999,9999,99999,999,999,999`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].calories).toBe(99999);
    });

    it('should handle case-insensitive column matching', () => {
      const csv = `date,time,food name,serving qty,serving weight (g),calories (kcal),fat (g),carbs (g),protein (g)
2024-03-15,12:30 PM,Food,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toBe('Food');
    });

    it('should skip malformed rows and continue processing', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,Good Food,1,100,165,3.6,0,31
invalid,data,here
2024-03-16,12:30 PM,Another Good Food,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].foodName).toBe('Good Food');
      expect(result[1].foodName).toBe('Another Good Food');
    });

    it('should handle empty food names', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,,1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toBe('');
    });

    it('should handle unicode characters in food names', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,"Café au Lait",1,100,165,3.6,0,31
2024-03-15,06:00 PM,"Crème Brûlée",2,200,260,0.6,57,5.3`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].foodName).toBe('Café au Lait');
      expect(result[1].foodName).toBe('Crème Brûlée');
    });

    it('should handle newlines within quoted fields', () => {
      const csv = `Date,Time,Food Name,Serving Qty,Serving Weight (g),Calories (kcal),Fat (g),Carbs (g),Protein (g)
2024-03-15,12:30 PM,"MultiLine Food",1,100,165,3.6,0,31`;

      const result = parseMacroFactorCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].foodName).toBe('MultiLine Food');
    });
  });
});
