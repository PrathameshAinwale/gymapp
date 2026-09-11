<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\WorkoutPlan;
use App\Models\DietPlan;
use Illuminate\Database\Seeder;

class MultiMemberWorkoutDietSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Priya Patel (mem-6) - Goal: Fat Loss & Athletic Conditioning
        $priya = User::where('email', 'priya.patel@example.com')->first();
        if ($priya) {
            WorkoutPlan::updateOrCreate(
                ['user_id' => $priya->id],
                [
                    'trainer_id' => 3,
                    'title' => '5-Day Functional Conditioning & Glute Sculpt Split',
                    'days' => [
                        [
                            'day' => 'Monday',
                            'label' => 'Glute Activation & Lower Body Power',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'p-m-1', 'name' => 'Barbell Hip Thrusts', 'sets' => '4', 'reps' => '12', 'weight' => '55 kg', 'rest' => 75, 'done' => false],
                                ['id' => 'p-m-2', 'name' => 'Goblet Squats (Kettlebell)', 'sets' => '3', 'reps' => '15', 'weight' => '16 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'p-m-3', 'name' => 'Walking Dumbbell Lunges', 'sets' => '3', 'reps' => '20 steps', 'weight' => '10 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'p-m-4', 'name' => 'Cable Glute Kickbacks', 'sets' => '3', 'reps' => '15 each', 'weight' => '12 kg', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Tuesday',
                            'label' => 'Upper Body Sculpt & HIIT Core',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'p-t-1', 'name' => 'Dumbbell Shoulder Overhead Press', 'sets' => '3', 'reps' => '12', 'weight' => '10 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'p-t-2', 'name' => 'Lat Pulldown (Neutral Grip)', 'sets' => '4', 'reps' => '12', 'weight' => '40 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'p-t-3', 'name' => 'Push-Ups (Tempo)', 'sets' => '3', 'reps' => '12-15', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                                ['id' => 'p-t-4', 'name' => 'Kettlebell Russian Twists', 'sets' => '3', 'reps' => '20', 'weight' => '8 kg', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Wednesday',
                            'label' => 'Metabolic Conditioning & Cardio Burst',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'p-w-1', 'name' => 'Rowing Machine Sprint Intervals', 'sets' => '5', 'reps' => '300m sprint', 'weight' => 'Level 8', 'rest' => 60, 'done' => false],
                                ['id' => 'p-w-2', 'name' => 'Kettlebell Swings', 'sets' => '4', 'reps' => '20', 'weight' => '16 kg', 'rest' => 45, 'done' => false],
                                ['id' => 'p-w-3', 'name' => 'Box Jumps / Step-Ups', 'sets' => '3', 'reps' => '15', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Thursday',
                            'label' => 'Hamstring & Posterior Chain',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'p-th-1', 'name' => 'Romanian Deadlifts (Dumbbells)', 'sets' => '4', 'reps' => '12', 'weight' => '18 kg each', 'rest' => 75, 'done' => false],
                                ['id' => 'p-th-2', 'name' => 'Seated Leg Curls', 'sets' => '3', 'reps' => '15', 'weight' => '35 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'p-th-3', 'name' => 'Plank Shoulder Taps', 'sets' => '3', 'reps' => '30 taps', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Friday',
                            'label' => 'Full Body Functional Athletic Burn',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'p-f-1', 'name' => 'Dumbbell Thrusters', 'sets' => '3', 'reps' => '12', 'weight' => '8 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'p-f-2', 'name' => 'Battle Ropes Slam Waves', 'sets' => '4', 'reps' => '40 sec', 'weight' => 'Standard', 'rest' => 45, 'done' => false],
                                ['id' => 'p-f-3', 'name' => 'Hanging Knee Raises', 'sets' => '3', 'reps' => '15', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                            ]
                        ]
                    ]
                ]
            );

            DietPlan::updateOrCreate(
                ['user_id' => $priya->id],
                [
                    'trainer_id' => 3,
                    'daily_calories_target' => 1850,
                    'protein_grams_target' => 130,
                    'carbs_grams_target' => 180,
                    'fats_grams_target' => 45,
                    'water_glasses_target' => 12,
                    'days' => [
                        [
                            'day' => 'Monday',
                            'meals' => [
                                ['id' => 'dp-p-1', 'name' => 'Metabolic Kickstart Breakfast', 'time' => '08:00 AM', 'items' => '3 Egg White Scramble + 1 Slice Multigrain Toast + Green Tea', 'calories' => 320, 'protein' => 24, 'carbs' => 28, 'fats' => 8],
                                ['id' => 'dp-p-2', 'name' => 'Pre-Workout Green Smoothie', 'time' => '11:00 AM', 'items' => 'Spinach + 1 Scoop Plant Protein + Chia Seeds (10g) + Coconut Water', 'calories' => 240, 'protein' => 25, 'carbs' => 20, 'fats' => 4],
                                ['id' => 'dp-p-3', 'name' => 'High Protein Quinoa Bowl', 'time' => '01:30 PM', 'items' => '150g Grilled Chicken / Tofu + Quinoa (1 cup) + Steamed Zucchini & Broccoli', 'calories' => 520, 'protein' => 42, 'carbs' => 55, 'fats' => 12],
                                ['id' => 'dp-p-4', 'name' => 'Afternoon Clean Fuel', 'time' => '05:00 PM', 'items' => '1 Apple with 1 tbsp Almond Butter + Green Tea', 'calories' => 190, 'protein' => 4, 'carbs' => 25, 'fats' => 9],
                                ['id' => 'dp-p-5', 'name' => 'Lean Recovery Dinner', 'time' => '08:00 PM', 'items' => '140g Grilled Salmon / Paneer Tikka + Fresh Cucumber Tomato Salad', 'calories' => 460, 'protein' => 35, 'carbs' => 22, 'fats' => 16],
                            ]
                        ]
                    ]
                ]
            );
        }

        // 2. Rohan Verma (mem-7) - Goal: Weight Loss & Cardiovascular Health
        $rohan = User::where('email', 'rohan.v@example.com')->first();
        if ($rohan) {
            WorkoutPlan::updateOrCreate(
                ['user_id' => $rohan->id],
                [
                    'trainer_id' => 2,
                    'title' => '4-Day Fat Burn & Metabolic Strength Split',
                    'days' => [
                        [
                            'day' => 'Monday',
                            'label' => 'Compound Upper Body & Row Intervals',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'r-m-1', 'name' => 'Chest-Supported Machine Row', 'sets' => '4', 'reps' => '12', 'weight' => '45 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'r-m-2', 'name' => 'Incline Dumbbell Chest Press', 'sets' => '3', 'reps' => '12', 'weight' => '18 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'r-m-3', 'name' => 'Treadmill Incline Power Walk (12% inc)', 'sets' => '1', 'reps' => '20 mins', 'weight' => '5.5 km/h', 'rest' => 0, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Tuesday',
                            'label' => 'Lower Body Functional & Core',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'r-t-1', 'name' => 'Leg Press (Moderate Stance)', 'sets' => '4', 'reps' => '15', 'weight' => '110 kg', 'rest' => 75, 'done' => false],
                                ['id' => 'r-t-2', 'name' => 'Dumbbell Romanian Deadlift', 'sets' => '3', 'reps' => '12', 'weight' => '16 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'r-t-3', 'name' => 'Ab Crunches on Stability Ball', 'sets' => '3', 'reps' => '20', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Thursday',
                            'label' => 'Full Body Functional Metabolic Circuit',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'r-th-1', 'name' => 'Kettlebell Deadlift to High Pull', 'sets' => '4', 'reps' => '12', 'weight' => '20 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'r-th-2', 'name' => 'Cable Lat Pulldown', 'sets' => '3', 'reps' => '12', 'weight' => '45 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'r-th-3', 'name' => 'Stationary Bike HIIT Intervals', 'sets' => '8', 'reps' => '30s fast / 30s slow', 'weight' => 'Gear 10', 'rest' => 30, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Friday',
                            'label' => 'Core Strength & Steady Zone 2 Cardio',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'r-f-1', 'name' => 'Front Plank Holds', 'sets' => '3', 'reps' => '45 sec', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                                ['id' => 'r-f-2', 'name' => 'Dumbbell Farmers Walk', 'sets' => '3', 'reps' => '40 meters', 'weight' => '20 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'r-f-3', 'name' => 'Elliptical Cross-Trainer Session', 'sets' => '1', 'reps' => '25 mins', 'weight' => 'Resistance 8', 'rest' => 0, 'done' => false],
                            ]
                        ]
                    ]
                ]
            );

            DietPlan::updateOrCreate(
                ['user_id' => $rohan->id],
                [
                    'trainer_id' => 2,
                    'daily_calories_target' => 2050,
                    'protein_grams_target' => 145,
                    'carbs_grams_target' => 210,
                    'fats_grams_target' => 50,
                    'water_glasses_target' => 12,
                    'days' => [
                        [
                            'day' => 'Monday',
                            'meals' => [
                                ['id' => 'dp-r-1', 'name' => 'High Fiber Oats & Protein', 'time' => '08:30 AM', 'items' => 'Rolled Oats (50g) + 1 Scoop Whey + Chia Seeds + Berries', 'calories' => 410, 'protein' => 32, 'carbs' => 52, 'fats' => 8],
                                ['id' => 'dp-r-2', 'name' => 'Mid-Morning Snack', 'time' => '11:30 AM', 'items' => 'Greek Yogurt (150g) + 8 Almonds', 'calories' => 180, 'protein' => 16, 'carbs' => 12, 'fats' => 7],
                                ['id' => 'dp-r-3', 'name' => 'Balanced Deficit Lunch', 'time' => '02:00 PM', 'items' => 'Brown Rice (1 cup) + Yellow Dal Tadka + 150g Chicken/Paneer + Cucumber Salad', 'calories' => 620, 'protein' => 44, 'carbs' => 72, 'fats' => 14],
                                ['id' => 'dp-r-4', 'name' => 'Evening Energy Tea', 'time' => '05:30 PM', 'items' => 'Roasted Makhana (30g) + Lemon Green Tea', 'calories' => 150, 'protein' => 6, 'carbs' => 28, 'fats' => 2],
                                ['id' => 'dp-r-5', 'name' => 'Light Protein Dinner', 'time' => '08:30 PM', 'items' => '140g Grilled Breast/Tofu with Sautéed Veggies + Clear Soup', 'calories' => 480, 'protein' => 42, 'carbs' => 28, 'fats' => 12],
                            ]
                        ]
                    ]
                ]
            );
        }

        // 3. Ananya Iyer (mem-8) - Goal: Hypertrophy, Flexibility & Core Stability
        $ananya = User::where('email', 'ananya.iyer@example.com')->first();
        if ($ananya) {
            WorkoutPlan::updateOrCreate(
                ['user_id' => $ananya->id],
                [
                    'trainer_id' => 3,
                    'title' => '5-Day Glute Hypertrophy, Mobility & Pilates Split',
                    'days' => [
                        [
                            'day' => 'Monday',
                            'label' => 'Glute Hypertrophy & Hamstring Isolation',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'a-m-1', 'name' => 'Barbell Glute Bridges', 'sets' => '4', 'reps' => '12', 'weight' => '60 kg', 'rest' => 75, 'done' => false],
                                ['id' => 'a-m-2', 'name' => 'Bulgarian Split Squats', 'sets' => '3', 'reps' => '10 each', 'weight' => '12 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'a-m-3', 'name' => 'Lying Leg Curls', 'sets' => '3', 'reps' => '15', 'weight' => '30 kg', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Tuesday',
                            'label' => 'Upper Back & Posture Alignment',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'a-t-1', 'name' => 'Face Pulls with External Rotation', 'sets' => '4', 'reps' => '15', 'weight' => '15 kg', 'rest' => 45, 'done' => false],
                                ['id' => 'a-t-2', 'name' => 'Dumbbell Seated Overhead Press', 'sets' => '3', 'reps' => '12', 'weight' => '8 kg each', 'rest' => 60, 'done' => false],
                                ['id' => 'a-t-3', 'name' => 'Resistance Band Lateral Pull-Aparts', 'sets' => '3', 'reps' => '20', 'weight' => 'Light Band', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Wednesday',
                            'label' => 'Pilates Core & Thoracic Mobility',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'a-w-1', 'name' => 'Dead Bug with Core Press', 'sets' => '3', 'reps' => '16 total', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                                ['id' => 'a-w-2', 'name' => 'Bird-Dog Iso Holds (3 sec)', 'sets' => '3', 'reps' => '12 each', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                                ['id' => 'a-w-3', 'name' => 'Side Plank Hip Dips', 'sets' => '3', 'reps' => '12 each', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Thursday',
                            'label' => 'Lower Body Volume & Quad Sculpt',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'a-th-1', 'name' => 'Hack Squats (Narrow Stance)', 'sets' => '4', 'reps' => '12', 'weight' => '40 kg', 'rest' => 75, 'done' => false],
                                ['id' => 'a-th-2', 'name' => 'Leg Extension Machine', 'sets' => '3', 'reps' => '15', 'weight' => '30 kg', 'rest' => 45, 'done' => false],
                                ['id' => 'a-th-3', 'name' => 'Standing Calf Raises', 'sets' => '3', 'reps' => '20', 'weight' => '35 kg', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Friday',
                            'label' => 'Full Body Functional Tone & Core',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'a-f-1', 'name' => 'Kettlebell Goblet Squat to Press', 'sets' => '3', 'reps' => '12', 'weight' => '12 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'a-f-2', 'name' => 'Cable Woodchops', 'sets' => '3', 'reps' => '15 each', 'weight' => '15 kg', 'rest' => 45, 'done' => false],
                                ['id' => 'a-f-3', 'name' => 'Hanging Leg Raises', 'sets' => '3', 'reps' => '12', 'weight' => 'BW', 'rest' => 45, 'done' => false],
                            ]
                        ]
                    ]
                ]
            );

            DietPlan::updateOrCreate(
                ['user_id' => $ananya->id],
                [
                    'trainer_id' => 3,
                    'daily_calories_target' => 1950,
                    'protein_grams_target' => 135,
                    'carbs_grams_target' => 205,
                    'fats_grams_target' => 48,
                    'water_glasses_target' => 10,
                    'days' => [
                        [
                            'day' => 'Monday',
                            'meals' => [
                                ['id' => 'dp-a-1', 'name' => 'High Protein Sprout Salad', 'time' => '08:30 AM', 'items' => 'Sprouted Moong & Chana + 2 Boiled Eggs + 1 Slice Multigrain Toast', 'calories' => 380, 'protein' => 26, 'carbs' => 42, 'fats' => 9],
                                ['id' => 'dp-a-2', 'name' => 'Iced Whey Cold Brew', 'time' => '11:30 AM', 'items' => 'Cold Brew Coffee + 1 Scoop Whey Protein + 10 Walnuts', 'calories' => 220, 'protein' => 24, 'carbs' => 8, 'fats' => 9],
                                ['id' => 'dp-a-3', 'name' => 'Nutritious Quinoa Khichdi', 'time' => '01:45 PM', 'items' => 'Quinoa Dal Khichdi (1 bowl) + 120g Paneer/Chicken + Curd (1 cup)', 'calories' => 560, 'protein' => 38, 'carbs' => 64, 'fats' => 15],
                                ['id' => 'dp-a-4', 'name' => 'Afternoon Antioxidant Snack', 'time' => '05:30 PM', 'items' => 'Roasted Pumpkin Seeds + 1 Dark Chocolate Square + Green Tea', 'calories' => 180, 'protein' => 7, 'carbs' => 18, 'fats' => 8],
                                ['id' => 'dp-a-5', 'name' => 'Lean Protein Supper', 'time' => '08:30 PM', 'items' => 'Grilled Fish / Tofu Tikka (150g) + Steamed Greens & Bell Peppers', 'calories' => 450, 'protein' => 40, 'carbs' => 25, 'fats' => 11],
                            ]
                        ]
                    ]
                ]
            );
        }

        // 4. Kabir Mehra (mem-9) - Goal: General Fitness & Weight Loss
        $kabir = User::where('email', 'kabir.m@example.com')->first();
        if ($kabir) {
            WorkoutPlan::updateOrCreate(
                ['user_id' => $kabir->id],
                [
                    'trainer_id' => 2,
                    'title' => '4-Day Strength Rebuild & Joint-Safe Split',
                    'days' => [
                        [
                            'day' => 'Monday',
                            'label' => 'Chest & Arm Strength (Machine Supported)',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'k-m-1', 'name' => 'Seated Chest Press Machine', 'sets' => '4', 'reps' => '12', 'weight' => '50 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'k-m-2', 'name' => 'Pec Deck Machine Fly', 'sets' => '3', 'reps' => '12', 'weight' => '35 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'k-m-3', 'name' => 'Dumbbell Bicep Curls', 'sets' => '3', 'reps' => '12', 'weight' => '12 kg each', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Tuesday',
                            'label' => 'Back & Core (Low-Back Safe)',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'k-t-1', 'name' => 'Wide Grip Lat Pulldown', 'sets' => '4', 'reps' => '12', 'weight' => '50 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'k-t-2', 'name' => 'Chest Supported T-Bar Row', 'sets' => '3', 'reps' => '10', 'weight' => '35 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'k-t-3', 'name' => 'Standing Cable Core Woodchopper', 'sets' => '3', 'reps' => '15', 'weight' => '15 kg', 'rest' => 45, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Thursday',
                            'label' => 'Lower Body Mobility & Knee Stability',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'k-th-1', 'name' => 'Leg Press (High & Wide Stance)', 'sets' => '4', 'reps' => '12', 'weight' => '100 kg', 'rest' => 75, 'done' => false],
                                ['id' => 'k-th-2', 'name' => 'Seated Leg Extensions', 'sets' => '3', 'reps' => '15', 'weight' => '35 kg', 'rest' => 60, 'done' => false],
                                ['id' => 'k-th-3', 'name' => 'Seated Hamstring Curls', 'sets' => '3', 'reps' => '15', 'weight' => '35 kg', 'rest' => 60, 'done' => false],
                            ]
                        ],
                        [
                            'day' => 'Friday',
                            'label' => 'Metabolic Conditioning & Low Impact Cardio',
                            'restDay' => false,
                            'exercises' => [
                                ['id' => 'k-f-1', 'name' => 'Recumbent Bike Steady Rhythm', 'sets' => '1', 'reps' => '20 mins', 'weight' => 'Level 7', 'rest' => 0, 'done' => false],
                                ['id' => 'k-f-2', 'name' => 'Cable Face Pulls', 'sets' => '3', 'reps' => '15', 'weight' => '18 kg', 'rest' => 45, 'done' => false],
                                ['id' => 'k-f-3', 'name' => 'Farmer Walk (Heavy DB)', 'sets' => '3', 'reps' => '30 meters', 'weight' => '18 kg each', 'rest' => 60, 'done' => false],
                            ]
                        ]
                    ]
                ]
            );

            DietPlan::updateOrCreate(
                ['user_id' => $kabir->id],
                [
                    'trainer_id' => 2,
                    'daily_calories_target' => 2200,
                    'protein_grams_target' => 155,
                    'carbs_grams_target' => 230,
                    'fats_grams_target' => 55,
                    'water_glasses_target' => 11,
                    'days' => [
                        [
                            'day' => 'Monday',
                            'meals' => [
                                ['id' => 'dp-k-1', 'name' => 'Protein Omelette & Toast', 'time' => '08:30 AM', 'items' => '3 Whole Eggs + 2 Egg Whites Scramble + 2 Whole Wheat Slices', 'calories' => 460, 'protein' => 32, 'carbs' => 38, 'fats' => 15],
                                ['id' => 'dp-k-2', 'name' => 'Mid-Day Protein Shake', 'time' => '11:30 AM', 'items' => '1 Scoop Whey with 200ml Skim Milk + 1 Banana', 'calories' => 270, 'protein' => 28, 'carbs' => 32, 'fats' => 3],
                                ['id' => 'dp-k-3', 'name' => 'Wholesome Rajma & Rice Meal', 'time' => '02:00 PM', 'items' => 'Steamed Rice (1.5 cups) + Rajma Curry + 100g Chicken/Paneer + Fresh Salad', 'calories' => 650, 'protein' => 46, 'carbs' => 84, 'fats' => 14],
                                ['id' => 'dp-k-4', 'name' => 'Evening Snack', 'time' => '05:30 PM', 'items' => 'Roasted Chana + 1 Fresh Orange + Black Coffee', 'calories' => 180, 'protein' => 8, 'carbs' => 34, 'fats' => 3],
                                ['id' => 'dp-k-5', 'name' => 'Nutritious Multigrain Dinner', 'time' => '08:30 PM', 'items' => '2 Multigrain Rotis + Dal Palak + 120g Grilled Chicken/Paneer', 'calories' => 540, 'protein' => 41, 'carbs' => 58, 'fats' => 14],
                            ]
                        ]
                    ]
                ]
            );
        }
    }
}
