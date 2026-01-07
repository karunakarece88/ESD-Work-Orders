export const SECTIONS = [
    { id: 'civil', name: 'Civil section', icon: 'Construction' },
    { id: 'electrical', name: 'Electrical section', icon: 'Zap' },
    { id: 'ac', name: 'AC and Refrigeration section', icon: 'Wind' },
    { id: 'workshop', name: 'Work shop section', icon: 'Wrench' },
    { id: 'fabrication', name: 'Fabrication section', icon: 'Hammer' },
    { id: 'instrumentation', name: 'Instrumentation section', icon: 'Microscope', labOnly: true }
];

export const SECTION_PASSWORDS = {
    main_esd: "esd",
    civil: "civil",
    electrical: "electrical",
    workshop: "workshop",
    ac: "acr",
    fabrication: "fab",
    instrumentation: "instrumentation",
    hod: "hod"
};


export const DEPARTMENTS = [
    "Administration",
    "Stores & Purchase",
    "Security",
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

export const BUILDING_NAMES = [
    "Chemical Engineering",
    "Design Engineering",
    "Computer Section",
    "LTC",
    "BEES",
    "Bio Gas",
    "Admin Building",
    "PC Ray",
    "Library",
    "PP-1",
    "PP-2",
    "PP-3",
    "PP-4",
    "Stores",
    "Entomology",
    "Old Applied Biology",
    "Toxicology",
    "Semio Chemicals",
    "Nano Materials",
    "Discovery",
    "NMR",
    "GCL Building",
    "FCL Building",
    "Mole Bank",
    "DEEE",
    "Establishment",
    "General Section",
    "Pension",
    "Recruitment",
    "General Administration"
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

export const TENDERS_SUB_SECTIONS = [
    { id: 't_civil_lab', name: 'Civil (LAB)', baseId: 'civil', location: 'lab' },
    { id: 't_civil_outside', name: 'Civil (Staff Quarters & Outside campus)', baseId: 'civil', location: 'quarter' },
    { id: 't_electrical_lab', name: 'Electrical (LAB)', baseId: 'electrical', location: 'lab' },
    { id: 't_electrical_outside', name: 'Electrical (Staff Quarters & Outside campus)', baseId: 'electrical', location: 'quarter' },
    { id: 't_ac_lab', name: 'AC (LAB)', baseId: 'ac', location: 'lab' },
    { id: 't_ac_outside', name: 'AC (Staff Quarters & Outside campus)', baseId: 'ac', location: 'quarter' },
    { id: 't_workshop_lab', name: 'Workshop (LAB)', baseId: 'workshop', location: 'lab' },
    { id: 't_workshop_outside', name: 'Workshop (Staff Quarters & Outside campus)', baseId: 'workshop', location: 'quarter' },
    { id: 't_fabrication_lab', name: 'Fabrication (LAB)', baseId: 'fabrication', location: 'lab' },
    { id: 't_fabrication_outside', name: 'Fabrication (Staff Quarters & Outside campus)', baseId: 'fabrication', location: 'quarter' },
    { id: 't_instrumentation_lab', name: 'Instrumentation (LAB)', baseId: 'instrumentation', location: 'lab' }
];

export const TECHNICIANS = {
    electrical: {
        lab: ["Umesh", "Nikesh", "Achuth", "Sai", "Yousaf", "Muthyalu", "Srinivas.A"],
        outside: [] // Set to empty as per "other than Electrical(LAB) it should not show the above techinican names"
    }
};
