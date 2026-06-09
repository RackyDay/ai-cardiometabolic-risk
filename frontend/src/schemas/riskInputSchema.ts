export const riskInputSchema = {
    
    gender: {
        name: "gender",
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
        input_label: "How old are you?",
        type: "number",
        defaultValue: null,
        required: true,
        min: 1,
        max: 150,
        category: "demographic",
    },

    education: {
        name: "education",
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
        input_label: "Are you a smoker?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "lifestyle",
    },

    cigsPerDay: {
        name: "cigsPerDay",
        input_label: "How many cigarettes do you smoke a day?",
        type: "number",
        defaultValue: null,
        required: true,
        min: 0,
        max: 500,
        category: "lifestyle",
    },

    bpMeds: {
        name: "bpMeds",
        input_label: "Do you take any blood pressure medication?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    prevalentStroke: {
        name: "prevalentStroke",
        input_label: "Have you ever had a stroke?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    prevalentHyp: {
        name: "prevalentHyp",
        input_label: "Have you been clinically diagnosed with hypertension?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    diabetes: {
        name: "diabetes",
        input_label: "Have you been clinically diagnosed with diabetes?",
        type: "boolean",
        defaultValue: null,
        required: true,
        category: "medical history",
    },

    sysBP: {
        name: "sysBP",
        input_label: "What is your systolic blood pressure?",
        type: "number",
        defaultValue: null,
        required: false,
        min: 70,
        max: 300,
        units: "mmHg",
        category: "clinical",
    },

    diaBP: {
        name: "diaBP",
        input_label: "What is your diastolic blood pressure?",
        type: "number",
        defaultValue: null,
        required: false,
        min: 40,
        max: 200,
        units: "mmHg",
        category: "clinical",
    },

    BMI: {
        name: "BMI",
        input_label: "What is your body mass index (BMI)?",
        type: "number",
        defaultValue: null,
        required: false,
        min: 10,
        max: 60,
        units: "kg/m^2",
        category: "clinical",
    },

    heartRate: {
        name: "heartRate",
        input_label: "What is your resting heart rate (in beats per minute)?",
        type: "number",
        defaultValue: null,
        required: false,
        min: 30,
        max: 200,
        units: "bpm",
        category: "clinical",
    },

    glucose: {
        name: "glucose",
        input_label: "What is your current fasting blood glucose level?",
        type: "number",
        defaultValue: null,
        required: false,
        min: 40,
        max: 500,
        units: "mg/dL",
        category: "clinical",
    },

    totChol: {
        name: "totChol",
        input_label: "What is your total cholesterol level?",
        type: "number",
        defaultValue: null,
        required: false,
        min: 100,
        max: 600,
        units: "mg/dL",
        category: "clinical",
    },
}