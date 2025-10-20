#!/bin/bash

# Migration Script: Update Student ID Format for Billions of Students
# This script updates existing student IDs from 4-digit to 10-digit format

echo "🚀 Starting Student ID Format Migration..."
echo "📊 Updating from STU0001 format to STU0000000001 format"
echo "📈 New capacity: 9,999,999,999 students (billions supported!)"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the zenow-learn-backend directory"
    exit 1
fi

# Check if database connection is available
echo "🔍 Checking database connection..."
node -e "
const { dbManager } = require('./dist/utils/databaseManager');
dbManager.query('SELECT 1')
    .then(() => {
        console.log('✅ Database connection successful');
        process.exit(0);
    })
    .catch((err) => {
        console.log('❌ Database connection failed:', err.message);
        process.exit(1);
    });
"

if [ $? -ne 0 ]; then
    echo "❌ Cannot proceed without database connection"
    exit 1
fi

echo ""
echo "🔄 Running migration..."

# Run the migration
node -e "
const { dbManager } = require('./dist/utils/databaseManager');

async function runMigration() {
    try {
        console.log('📝 Step 1: Updating column type...');
        await dbManager.query('ALTER TABLE students ALTER COLUMN student_id TYPE VARCHAR(15)');
        console.log('✅ Column type updated successfully');
        
        console.log('📝 Step 2: Updating existing student IDs...');
        const result = await dbManager.query(\`
            UPDATE students 
            SET student_id = 'STU' || LPAD(SUBSTRING(student_id FROM 4)::INTEGER::TEXT, 10, '0')
            WHERE LENGTH(student_id) = 7
        \`);
        console.log(\`✅ Updated \${result.rowCount} student IDs\`);
        
        console.log('📝 Step 3: Adding column comment...');
        await dbManager.query(\`
            COMMENT ON COLUMN students.student_id IS 'Custom student ID format: STU + 10-digit number (STU0000000001 to STU9999999999). Supports up to 9,999,999,999 students.'
        \`);
        console.log('✅ Column comment added');
        
        console.log('📝 Step 4: Verifying migration...');
        const stats = await dbManager.query(\`
            SELECT 
                COUNT(*) as total_students,
                MIN(student_id) as min_student_id,
                MAX(student_id) as max_student_id,
                AVG(LENGTH(student_id)) as avg_id_length
            FROM students
        \`);
        
        const stat = stats.rows[0];
        console.log('📊 Migration Results:');
        console.log(\`   Total Students: \${stat.total_students}\`);
        console.log(\`   Min Student ID: \${stat.min_student_id}\`);
        console.log(\`   Max Student ID: \${stat.max_student_id}\`);
        console.log(\`   Average ID Length: \${parseFloat(stat.avg_id_length).toFixed(1)} characters\`);
        
        console.log('');
        console.log('🎉 Migration completed successfully!');
        console.log('📈 Student ID capacity: 9,999,999,999 students');
        console.log('🆔 New format: STU0000000001 to STU9999999999');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
"

echo ""
echo "✨ Student ID format migration completed!"
echo "🆔 New student IDs will now be generated in format: STU0000000001"
echo "📈 Capacity increased from 9,999 to 9,999,999,999 students"
