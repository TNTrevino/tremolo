# Data Generation Documentation

## Overview

The Tremolo data generation system creates realistic test data for the music education platform. It generates schools, teachers, students, and note game entries with realistic progression patterns.

## Current Configuration

When you run `GenerateData()`, the system creates:

### Schools
- **Count**: 1,000 schools
- **Names**: Randomly generated (e.g., "John Smith High School", "Washington Middle School")
- **Locations**: Realistic cities, counties, states, and countries
- **Dates**: Created between 2024-2025

### Teachers & Students
- **Teachers**: 20 teachers
- **Students per Teacher**: 20 students
- **Total Students**: 400 students (20 teachers × 20 students)
- **Total Users**: 420 users (20 teachers + 400 students)

### Student Progress Entries
Each student gets **20-100 note game entries** (average ~60 entries)

**Estimated Total Entries**:
- Minimum: 8,000 entries (400 students × 20)
- Maximum: 40,000 entries (400 students × 100)
- Average: ~24,000 entries (400 students × 60)

## Data Quality Features

### Realistic Student Progression

Each student is assigned a unique **Progress Profile** that determines:

1. **Skill Level** (40% Beginner, 40% Intermediate, 20% Advanced)
   - Beginner: 40-80 NPM, 40-70% accuracy
   - Intermediate: 80-110 NPM, 65-85% accuracy
   - Advanced: 110-127 NPM, 80-98% accuracy

2. **Improvement Rate** (Slow, Medium, or Fast learner)
   - Slow: +0.1 NPM/day, +0.02% accuracy/day
   - Medium: +0.3 NPM/day, +0.05% accuracy/day
   - Fast: +0.6 NPM/day, +0.1% accuracy/day

3. **Consistency** (0.5-1.0, higher = more consistent performance)

### Realistic Data Correlations

- **NPM ↔ Questions**: Questions = (Session Length × NPM) ± 15% variance
- **Time ↔ Questions**: Longer sessions have proportionally more questions
- **Chronological Progress**: Entries are sorted by date, showing improvement over time
- **Bad Days**: 15% of entries have reduced performance (NPM -30%, accuracy -20%)

### Date Ranges

- **Years**: 2024-2025 only
- **Current Date Limit**: No dates beyond November 8, 2025
- **Distribution**: Entries are chronologically distributed across the date range

## Customizing Data Generation

### Change Number of Teachers/Students

Edit `generation/data_gen.go`:

```go
// Default: 20 teachers, 20 students each
fmt.Println(insertMultipleTeachersWithStudents(20, 20))

// Example: 50 teachers, 15 students each
fmt.Println(insertMultipleTeachersWithStudents(50, 15))

// Example: 10 teachers, 30 students each
fmt.Println(insertMultipleTeachersWithStudents(10, 30))
```

### Change Number of Schools

Edit `generation/insert_data.go`, function `insertFakeSchools()`:

```go
for range 1000 {  // Change this number
    fakeSchool := generateFakeSchool()
    // ...
}
```

### Change Entry Count per Student

Edit `generation/insert_data.go`, function `insertFakeTeacherWithStudents()`:

```go
// Default: 20-100 entries per student
entryCount := 20 + rand.IntN(81)

// Example: 50-150 entries per student
entryCount := 50 + rand.IntN(101)

// Example: Fixed 75 entries per student
entryCount := 75
```

## Running Data Generation

### Via Application Flag

```bash
go run main.go --fake-it
```

### Programmatically

```go
import "sight-reading/generation"

func main() {
    generation.GenerateData()
}
```

### Via Test (Demo Mode)

```bash
go test -v ./generation -run TestDemoRealisticData
```

## Data Generation Output Example

When you run data generation, you'll see progress logs:

```
Starting bulk data generation: 20 teachers, 20 students each...
Total users to create: 20 teachers + 400 students = 420 users
Estimated entries per student: 20-100 (avg ~60)
Estimated total entries: 8000 - 40000 entries

[1/20] Creating teacher with 20 students...
   Progress: 5/20 students created (last student: 45 entries)
   Progress: 10/20 students created (last student: 67 entries)
   Progress: 15/20 students created (last student: 89 entries)
   Progress: 20/20 students created (last student: 52 entries)
✓ Teacher 1: John Smith (ID assigned)

[2/20] Creating teacher with 20 students...
...

✅ Data generation complete!
   Created: 20 teachers
   Created: 400 students
   Total users: 420
```

## Database Schema

The generated data populates these tables:

- `schools` - School information
- `users` - Teachers and students (role-based)
- `teacher_student` - Teacher-student relationships
- `note_game_entries` - Student practice session data

## Performance Considerations

### Generation Time

Approximate time estimates:

| Teachers | Students | Avg Entries | Total Entries | Estimated Time |
|----------|----------|-------------|---------------|----------------|
| 20       | 400      | 60          | ~24,000       | ~2-5 minutes   |
| 50       | 1,000    | 60          | ~60,000       | ~5-15 minutes  |
| 100      | 2,000    | 60          | ~120,000      | ~10-30 minutes |

*Note: Times vary based on database performance and network latency*

### Database Size

Approximate size estimates:

- Each user: ~500 bytes
- Each entry: ~200 bytes
- **Example** (20 teachers, 400 students, 24,000 entries):
  - Users: 420 × 500 bytes ≈ 210 KB
  - Entries: 24,000 × 200 bytes ≈ 4.8 MB
  - **Total**: ~5 MB

## Testing

All data generation functions are thoroughly tested:

```bash
# Run all generation tests
go test -v ./generation/...

# Run specific test
go test -v ./generation -run TestGenerateRealisticNoteGameEntries

# Run demo
go test -v ./generation -run TestDemoRealisticData
```

## Key Files

- `data_gen.go` - Main entry point for data generation
- `gen_utilities.go` - Helper functions and constants
- `insert_data.go` - Database insertion functions
- `gen_utilities_test.go` - Comprehensive test suite
- `demo_realistic_data.go` - Interactive demonstration

## Example: Realistic Student Data

```
Student: Sarah Johnson (Beginner → Intermediate)
Profile: Base NPM 50, +0.3/day growth, 75% consistency

Entry 1  | 2024-01-15 | NPM:  52 | 245/587   (41.7%) | 12 min
Entry 10 | 2024-04-20 | NPM:  78 | 891/1456  (61.2%) | 18 min
Entry 30 | 2024-09-15 | NPM: 102 | 1823/2654 (68.7%) | 27 min
Entry 50 | 2025-05-10 | NPM: 125 | 2456/2891 (84.9%) | 23 min

Progress: +73 NPM, +43.2% accuracy improvement over 480 days
```

## Support

For questions or issues with data generation:
1. Check this documentation
2. Review test files for examples
3. Run the demo: `go test -v ./generation -run TestDemoRealisticData`
