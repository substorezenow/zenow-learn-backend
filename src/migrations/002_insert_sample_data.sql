-- Migration: Insert Sample Course Data
-- Description: Inserts sample data for the course hierarchy

-- Insert Categories (Level 1)
INSERT INTO categories (name, slug, description, icon_url, sort_order) VALUES
('General Education', 'general-education', 'Basic education courses for fundamental learning', '/icons/general.svg', 1),
('Engineering', 'engineering', 'Technical and engineering courses', '/icons/engineering.svg', 2),
('Medical', 'medical', 'Medical and healthcare courses', '/icons/medical.svg', 3),
('Business', 'business', 'Business and management courses', '/icons/business.svg', 4),
('Arts & Design', 'arts-design', 'Creative arts and design courses', '/icons/arts.svg', 5);

-- Insert Fields (Level 2)
INSERT INTO fields (category_id, name, slug, description, icon_url, sort_order) VALUES
-- General Education Fields
((SELECT id FROM categories WHERE slug = 'general-education'), 'Basic Mathematics', 'basic-math', 'Fundamental mathematics courses', '/icons/math.svg', 1),
((SELECT id FROM categories WHERE slug = 'general-education'), 'Reading & Writing', 'reading-writing', 'Language and literacy courses', '/icons/language.svg', 2),
((SELECT id FROM categories WHERE slug = 'general-education'), 'Science Basics', 'science-basics', 'Basic science concepts', '/icons/science.svg', 3),

-- Engineering Fields
((SELECT id FROM categories WHERE slug = 'engineering'), 'Computer Science', 'computer-science', 'Programming and computer science courses', '/icons/cs.svg', 1),
((SELECT id FROM categories WHERE slug = 'engineering'), 'Mechanical Engineering', 'mechanical-engineering', 'Mechanical engineering courses', '/icons/mechanical.svg', 2),
((SELECT id FROM categories WHERE slug = 'engineering'), 'Electrical Engineering', 'electrical-engineering', 'Electrical engineering courses', '/icons/electrical.svg', 3),
((SELECT id FROM categories WHERE slug = 'engineering'), 'Civil Engineering', 'civil-engineering', 'Civil engineering courses', '/icons/civil.svg', 4),
((SELECT id FROM categories WHERE slug = 'engineering'), 'Robotics', 'robotics', 'Robotics and automation courses', '/icons/robotics.svg', 5),

-- Medical Fields
((SELECT id FROM categories WHERE slug = 'medical'), 'General Medicine', 'general-medicine', 'General medical courses', '/icons/medicine.svg', 1),
((SELECT id FROM categories WHERE slug = 'medical'), 'Nursing', 'nursing', 'Nursing and patient care courses', '/icons/nursing.svg', 2),
((SELECT id FROM categories WHERE slug = 'medical'), 'Pharmacy', 'pharmacy', 'Pharmaceutical courses', '/icons/pharmacy.svg', 3),

-- Business Fields
((SELECT id FROM categories WHERE slug = 'business'), 'Management', 'management', 'Business management courses', '/icons/management.svg', 1),
((SELECT id FROM categories WHERE slug = 'business'), 'Marketing', 'marketing', 'Marketing and sales courses', '/icons/marketing.svg', 2),
((SELECT id FROM categories WHERE slug = 'business'), 'Finance', 'finance', 'Financial management courses', '/icons/finance.svg', 3),

-- Arts & Design Fields
((SELECT id FROM categories WHERE slug = 'arts-design'), 'Graphic Design', 'graphic-design', 'Visual design and graphics', '/icons/graphic.svg', 1),
((SELECT id FROM categories WHERE slug = 'arts-design'), 'Web Design', 'web-design', 'Web and UI/UX design', '/icons/web-design.svg', 2),
((SELECT id FROM categories WHERE slug = 'arts-design'), 'Photography', 'photography', 'Photography and visual arts', '/icons/photography.svg', 3);

-- Insert Courses (Level 3)
INSERT INTO courses (field_id, title, slug, description, short_description, duration_hours, difficulty_level, price, is_free, is_published, prerequisites, learning_outcomes, course_modules, tags) VALUES
-- Computer Science Courses
((SELECT id FROM fields WHERE slug = 'computer-science'), 'Frontend Development with React', 'frontend-react', 
 'Complete React.js course covering components, hooks, state management, and modern frontend development practices. Learn to build interactive web applications with React ecosystem.',
 'Master React.js for modern frontend development', 40, 'intermediate', 99.99, false, true,
 'Basic HTML, CSS, and JavaScript knowledge',
 '["Build interactive React applications", "Understand component lifecycle", "Implement state management", "Create responsive UIs"]',
 '["Introduction to React", "Components and Props", "State and Lifecycle", "Hooks and Context", "Routing and Navigation", "State Management", "Testing React Apps", "Deployment"]',
 '{"react", "frontend", "javascript", "web-development"}'),

((SELECT id FROM fields WHERE slug = 'computer-science'), 'Backend Development with Node.js', 'backend-nodejs',
 'Comprehensive Node.js course covering server-side development, APIs, databases, and deployment. Learn to build scalable backend applications.',
 'Master Node.js for backend development', 35, 'intermediate', 89.99, false, true,
 'Basic JavaScript knowledge',
 '["Build RESTful APIs", "Work with databases", "Implement authentication", "Deploy applications"]',
 '["Node.js Fundamentals", "Express.js Framework", "Database Integration", "Authentication & Security", "API Design", "Testing", "Deployment"]',
 '{"nodejs", "backend", "javascript", "api"}'),

((SELECT id FROM fields WHERE slug = 'computer-science'), 'Full Stack Development', 'fullstack-development',
 'Complete full stack development course combining frontend and backend technologies. Build end-to-end web applications.',
 'Complete full stack web development', 75, 'advanced', 179.99, false, true,
 'Basic programming knowledge',
 '["Build complete web applications", "Integrate frontend and backend", "Deploy full stack apps", "Implement best practices"]',
 '["Frontend Development", "Backend Development", "Database Design", "API Integration", "Authentication", "Deployment", "Testing", "Project Management"]',
 '{"fullstack", "web-development", "react", "nodejs"}'),

((SELECT id FROM fields WHERE slug = 'computer-science'), 'Python Programming', 'python-programming',
 'Learn Python from basics to advanced concepts. Perfect for beginners and those looking to enhance their programming skills.',
 'Master Python programming language', 30, 'beginner', 79.99, false, true,
 'No prior programming experience required',
 '["Write Python programs", "Understand OOP concepts", "Work with data structures", "Build practical projects"]',
 '["Python Basics", "Data Types", "Control Structures", "Functions", "Object-Oriented Programming", "File Handling", "Libraries", "Projects"]',
 '{"python", "programming", "beginner", "data-science"}'),

-- Mechanical Engineering Courses
((SELECT id FROM fields WHERE slug = 'mechanical-engineering'), 'Mechanical Design Basics', 'mechanical-design',
 'Fundamental mechanical design principles and CAD software usage. Learn to design mechanical components and systems.',
 'Learn mechanical design fundamentals', 25, 'beginner', 69.99, false, true,
 'Basic engineering knowledge',
 '["Design mechanical components", "Use CAD software", "Understand manufacturing processes", "Apply design principles"]',
 '["Design Principles", "CAD Software", "Materials Selection", "Manufacturing Processes", "Quality Control", "Project Design"]',
 '{"mechanical", "design", "cad", "engineering"}'),

-- General Education Courses
((SELECT id FROM fields WHERE slug = 'basic-math'), 'Basic Mathematics', 'basic-math',
 'Fundamental mathematics concepts including arithmetic, algebra, and geometry. Perfect for beginners.',
 'Master basic mathematical concepts', 20, 'beginner', 0.00, true, true,
 'No prior math knowledge required',
 '["Solve basic equations", "Understand geometric concepts", "Apply mathematical reasoning", "Build problem-solving skills"]',
 '["Arithmetic", "Algebra Basics", "Geometry", "Problem Solving", "Mathematical Reasoning"]',
 '{"mathematics", "basic", "education", "free"}'),

((SELECT id FROM fields WHERE slug = 'reading-writing'), 'Reading Comprehension', 'reading-comprehension',
 'Improve reading skills and comprehension abilities. Learn to analyze and understand various types of texts.',
 'Enhance reading and comprehension skills', 15, 'beginner', 0.00, true, true,
 'Basic reading ability',
 '["Improve reading speed", "Enhance comprehension", "Analyze texts", "Build vocabulary"]',
 '["Reading Strategies", "Comprehension Techniques", "Text Analysis", "Vocabulary Building", "Critical Thinking"]',
 '{"reading", "comprehension", "language", "free"}');

-- Insert Course Modules
INSERT INTO course_modules (course_id, title, description, module_type, duration_minutes, sort_order, is_free) VALUES
-- React Course Modules
((SELECT id FROM courses WHERE slug = 'frontend-react'), 'Introduction to React', 'Learn the basics of React.js and its ecosystem', 'video', 45, 1, true),
((SELECT id FROM courses WHERE slug = 'frontend-react'), 'Components and Props', 'Understanding React components and prop passing', 'video', 60, 2, false),
((SELECT id FROM courses WHERE slug = 'frontend-react'), 'State and Lifecycle', 'Managing component state and lifecycle methods', 'video', 50, 3, false),
((SELECT id FROM courses WHERE slug = 'frontend-react'), 'Hooks and Context', 'Modern React with hooks and context API', 'video', 55, 4, false),
((SELECT id FROM courses WHERE slug = 'frontend-react'), 'React Quiz 1', 'Test your React knowledge', 'quiz', 30, 5, false),

-- Node.js Course Modules
((SELECT id FROM courses WHERE slug = 'backend-nodejs'), 'Node.js Fundamentals', 'Introduction to Node.js and its core concepts', 'video', 40, 1, true),
((SELECT id FROM courses WHERE slug = 'backend-nodejs'), 'Express.js Framework', 'Building web applications with Express', 'video', 50, 2, false),
((SELECT id FROM courses WHERE slug = 'backend-nodejs'), 'Database Integration', 'Working with databases in Node.js', 'video', 60, 3, false),
((SELECT id FROM courses WHERE slug = 'backend-nodejs'), 'Authentication & Security', 'Implementing secure authentication', 'video', 45, 4, false),

-- Basic Math Course Modules
((SELECT id FROM courses WHERE slug = 'basic-math'), 'Arithmetic Operations', 'Basic addition, subtraction, multiplication, division', 'video', 30, 1, true),
((SELECT id FROM courses WHERE slug = 'basic-math'), 'Introduction to Algebra', 'Basic algebraic concepts and equations', 'video', 35, 2, true),
((SELECT id FROM courses WHERE slug = 'basic-math'), 'Geometry Basics', 'Understanding shapes, angles, and measurements', 'video', 40, 3, true),
((SELECT id FROM courses WHERE slug = 'basic-math'), 'Problem Solving', 'Applying mathematical concepts to solve problems', 'video', 25, 4, true);

-- Insert Course Bundles
INSERT INTO course_bundles (title, slug, description, short_description, total_duration_hours, difficulty_level, bundle_price, individual_price, discount_percentage, is_published, learning_outcomes, tags) VALUES
('Complete Web Development Bundle', 'web-development-bundle',
 'Frontend + Backend + Database course bundle covering the entire web development stack',
 'Master full stack web development', 110, 'intermediate', 249.99, 299.97, 16.67, true,
 '["Build complete web applications", "Master frontend and backend", "Deploy production apps", "Implement best practices"]',
 '{"web-development", "fullstack", "bundle", "react", "nodejs"}'),

('Engineering Fundamentals Bundle', 'engineering-fundamentals',
 'Mechanical + Electrical + Civil engineering basics for comprehensive understanding',
 'Learn engineering fundamentals', 60, 'beginner', 199.99, 239.97, 16.67, true,
 '["Understand engineering principles", "Apply design concepts", "Work with engineering tools", "Solve engineering problems"]',
 '{"engineering", "mechanical", "electrical", "civil", "fundamentals"}'),

('Programming Essentials Bundle', 'programming-essentials',
 'Python + JavaScript + Web Development for complete programming foundation',
 'Master programming fundamentals', 85, 'beginner', 179.99, 219.97, 18.18, true,
 '["Learn multiple programming languages", "Build practical projects", "Understand programming concepts", "Prepare for advanced courses"]',
 '{"programming", "python", "javascript", "web-development", "beginner"}');

-- Insert Bundle Courses (Many-to-Many relationship)
INSERT INTO bundle_courses (bundle_id, course_id, sort_order) VALUES
-- Web Development Bundle
((SELECT id FROM course_bundles WHERE slug = 'web-development-bundle'), (SELECT id FROM courses WHERE slug = 'frontend-react'), 1),
((SELECT id FROM course_bundles WHERE slug = 'web-development-bundle'), (SELECT id FROM courses WHERE slug = 'backend-nodejs'), 2),
((SELECT id FROM course_bundles WHERE slug = 'web-development-bundle'), (SELECT id FROM courses WHERE slug = 'fullstack-development'), 3),

-- Engineering Fundamentals Bundle
((SELECT id FROM course_bundles WHERE slug = 'engineering-fundamentals'), (SELECT id FROM courses WHERE slug = 'mechanical-design'), 1),

-- Programming Essentials Bundle
((SELECT id FROM course_bundles WHERE slug = 'programming-essentials'), (SELECT id FROM courses WHERE slug = 'python-programming'), 1),
((SELECT id FROM course_bundles WHERE slug = 'programming-essentials'), (SELECT id FROM courses WHERE slug = 'frontend-react'), 2),
((SELECT id FROM course_bundles WHERE slug = 'programming-essentials'), (SELECT id FROM courses WHERE slug = 'backend-nodejs'), 3);
