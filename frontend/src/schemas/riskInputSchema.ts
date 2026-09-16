export const riskInputSchema = {
    
    gender: {
        name: "gender",
        print_name: "Gender",
        input_label: "What is your gender?",
        type: "select",
        defaultValue: null,
        required: true,
        options: [  {value: "M", label: "Male"},
                    {value: "F", label: "Female"},
                    {value: "O", label: "Rather not say"}],
        category: "demographic"
    },
    
    age: {
        name: "age",
        print_name: "Age",
        input_label: "How old are you?",
        type: "number",
        decimal: false,
        defaultValue: null,
        required: true,
        min: 1,
        max: 150,
        category: "demographic",
        blockKeys: ["e", "E"],
        tooltip: "Your current age in years."
    },

    education: {
        name: "education",
        print_name: "Highest completed level of education",
        input_label: "What is the highest level of education you've completed?",
        type: "select",
        defaultValue: null,
        required: true,
        options: [  {value: 1, label: "Some High School"},
                    {value: 2, label: "High School/GED"}, 
                    {value: 3, label: "Some College/Vocational"}, 
                    {value: 4, label: "College Graduate"}],
        category: "demographic",
    },

    currentSmoker: {
        name: "currentSmoker",
        print_name: "Smoking status",
        input_label: "Are you a smoker?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "lifestyle",
    },

    cigsPerDay: {
        name: "cigsPerDay",
        print_name: "Number of cigarettes smoked per day",
        input_label: "How many cigarettes do you smoke a day?",
        type: "number",
        decimal: false,
        defaultValue: null,
        required: false,
        min: 0,
        max: 500,
        category: "lifestyle",
        blockKeys: ["e", "E"],
    },

    bpMeds: {
        name: "bpMeds",
        print_name: "Blood pressure medication status",
        input_label: "Do you take any blood pressure medication?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    prevalentStroke: {
        name: "prevalentStroke",
        print_name: "Stroke status",
        input_label: "Have you ever had a stroke?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    prevalentHyp: {
        name: "prevalentHyp",
        print_name: "Hypertension diagnosis status",
        input_label: "Have you been clinically diagnosed with hypertension?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    diabetes: {
        name: "diabetes",
        print_name: "Diabetes diagnosis status",
        input_label: "Have you been clinically diagnosed with diabetes?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    sysBP: {
        name: "sysBP",
        print_name: "Systolic blood pressure",
        input_label: "What is your systolic blood pressure?",
        type: "number",
        decimal: true,
        defaultValue: null,
        required: false,
        min: 70,
        max: 300,
        units: "mmHg",
        blockKeys: ["e", "E"],
        category: "clinical",
        tooltip: "Enter your systolic blood pressure in mmHg — the top number in a reading (e.g. the 120 in 120/80). A normal reading is typically around 120 mmHg."
    },

    diaBP: {
        name: "diaBP",
        print_name: "Diastolic blood pressure",
        input_label: "What is your diastolic blood pressure?",
        type: "number",
        decimal: true,
        defaultValue: null,
        required: false,
        min: 40,
        max: 200,
        units: "mmHg",
        blockKeys: ["e", "E"],
        category: "clinical",
        tooltip: "Enter your diastolic blood pressure in mmHg — the bottom number in a reading (e.g. the 80 in 120/80). A normal reading is typically around 80 mmHg."
    },

    BMI: {
        name: "BMI",
        print_name: "Body mass index",
        input_label: "What is your body mass index (BMI)?",
        type: "number",
        decimal: true,
        defaultValue: null,
        required: false,
        min: 10,
        max: 60,
        units: "kg/m^2",
        blockKeys: ["e", "E"],
        category: "clinical",
        tooltip: "Enter your BMI in kg/m². This is calculated as weight (kg) ÷ height (m)². A BMI of 18.5-24.9 is generally considered a healthy range."
    },

    heartRate: {
        name: "heartRate",
        print_name: "Resting heart rate",
        input_label: "What is your resting heart rate (in beats per minute)?",
        type: "number",
        decimal: true,
        defaultValue: null,
        required: false,
        min: 30,
        max: 200,
        units: "bpm",
        blockKeys: ["e", "E"],
        category: "clinical",
        tooltip: "Enter your resting heart rate in bpm, ideally measured after sitting quietly for a few minutes. A typical resting heart rate for adults is 60-100 bpm."
    },

    glucose: {
        name: "glucose",
        print_name: "Fasting blood glucose level",
        input_label: "What is your current fasting blood glucose level?",
        type: "number",
        decimal: true,
        defaultValue: null,
        required: false,
        min: 40,
        max: 500,
        units: "mg/dL",
        mmolConversionFactor: 18.0182,
        blockKeys: ["e", "E"],
        category: "clinical",
        tooltip: "Enter your fasting blood glucose level in mg/dL, measured after not eating for at least 8 hours. A normal fasting level is typically under 100 mg/dL."

    },

    totChol: {
        name: "totChol",
        print_name: "Total cholesterol level",
        input_label: "What is your total cholesterol level?",
        type: "number",
        decimal: true,
        defaultValue: null,
        required: false,
        min: 100,
        max: 600,
        units: "mg/dL",
        mmolConversionFactor: 38.67,
        blockKeys: ["e", "E"],
        category: "clinical",
        tooltip: "Enter your total cholesterol level in mg/dL, from a recent blood test (lipid panel). A desirable level is generally under 200 mg/dL."
    },
}