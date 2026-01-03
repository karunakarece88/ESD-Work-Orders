export const SECTIONS = [
    { id: 'civil', name: 'Civil section', icon: 'Construction' },
    { id: 'electrical', name: 'Electrical section', icon: 'Zap' },
    { id: 'ac', name: 'AC and Refrigeration', icon: 'Wind', labOnly: true },
    { id: 'workshop', name: 'Work shop', icon: 'Wrench' },
    { id: 'fabrication', name: 'Fabrication', icon: 'Hammer' }
];

export const DEPARTMENTS = [
    "Analytical & Structural Chemistry",
    "Applied Biology",
    "Catalysis & Fine Chemicals",
    "Chemical Engg. & Process Technology",
    "Energy & Environmental Engg.",
    "Fluoro-Agrochemicals",
    "Oils, Lipid Science & Technology",
    "Natural Products & Medicinal Chemistry",
    "Organic Synthesis & Process Chemistry",
    "Polymers & Functional Materials"
];

export const OUTSIDE_CAMPUS_AREAS = [
    "Guest house (Abhinandhan)",
    "Guest house (Atithi)",
    "Transport section",
    "Dispensary",
    "Staff Club",
    "ZM High School"
];

// Generates quarter numbers like C-1 to C-9, etc.
const generateQuarters = () => {
    const quarters = [];
    quarters.push("A&B");
    for (let i = 1; i <= 9; i++) quarters.push(`C-${i}`);
    for (let i = 1; i <= 20; i++) quarters.push(`D-${i}`);
    for (let i = 1; i <= 28; i++) quarters.push(`E-${i}`);
    for (let i = 1; i <= 52; i++) quarters.push(`F-${i}`);
    for (let i = 1; i <= 32; i++) quarters.push(`SRU-${i}`);
    for (let i = 1; i <= 44; i++) quarters.push(`DRU-${i}`);
    for (let i = 1; i <= 12; i++) quarters.push(`TRU-${i}`);
    return quarters;
};

export const QUARTERS = generateQuarters();

export const TECHNICIANS = {
    electrical: {
        lab: ["Umesh", "Nikesh", "Achuth", "Sai", "Yousaf", "Muthyalu", "Srinivas.A"],
        outside: ["Ramesh", "Mahesh", "Venkatesh", "Sai", "Santhosh", "Satish", "Babu"]
    }
};
