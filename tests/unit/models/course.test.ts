import { Course } from '../../../src/models/Course';
import { dbManager } from '../../../src/utils/databaseManager';

// Mock the database manager
jest.mock('../../../src/utils/databaseManager', () => ({
  dbManager: {
    query: jest.fn(),
  },
}));

describe('Course Model', () => {
  let courseModel: Course;
  const mockQuery = dbManager.query as jest.MockedFunction<typeof dbManager.query>;

  beforeEach(() => {
    courseModel = new Course();
    jest.clearAllMocks();
  });

  describe('getAllCourses', () => {
    it('should fetch all courses without filters', async () => {
      const mockCourses = [
        {
          id: 1,
          title: 'Test Course',
          slug: 'test-course',
          description: 'Test Description',
          field_name: 'Web Development',
          category_name: 'Programming'
        }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockCourses });

      const result = await courseModel.getAllCourses();

      expect(result).toEqual(mockCourses);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title'),
        []
      );
    });

    it('should apply filters correctly', async () => {
      const mockCourses = [{ id: 1, title: 'Filtered Course' }];
      mockQuery.mockResolvedValueOnce({ rows: mockCourses });

      const filters = {
        category_id: 1,
        difficulty_level: 'beginner',
        is_free: true,
        search: 'javascript'
      };

      const result = await courseModel.getAllCourses(filters);

      expect(result).toEqual(mockCourses);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND cat.id = $1'),
        expect.arrayContaining([1, 'beginner', true, '%javascript%'])
      );
    });
  });

  describe('getCourseById', () => {
    it('should fetch course by ID', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        slug: 'test-course'
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse] });

      const result = await courseModel.getCourseById(1);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1'),
        [1]
      );
    });

    it('should return null for non-existent course', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await courseModel.getCourseById(999);

      expect(result).toBeNull();
    });
  });

  describe('getCourseBySlug', () => {
    it('should fetch course by slug', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        slug: 'test-course'
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockCourse] });

      const result = await courseModel.getCourseBySlug('test-course');

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.slug = $1'),
        ['test-course']
      );
    });
  });

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      const courseData = {
        field_id: 1,
        title: 'New Course',
        slug: 'new-course',
        description: 'Course Description',
        short_description: 'Short Description',
        banner_image: 'banner.jpg',
        thumbnail_image: 'thumb.jpg',
        duration_hours: 10,
        difficulty_level: 'beginner',
        price: 99.99,
        is_free: false,
        instructor_id: 'instructor123',
        prerequisites: 'Basic knowledge',
        learning_outcomes: ['Learn basics'],
        course_modules: [],
        tags: ['javascript', 'web']
      };

      const mockCreatedCourse = { id: 1, ...courseData };
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedCourse] });

      const result = await courseModel.createCourse(courseData);

      expect(result).toEqual(mockCreatedCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining([
          courseData.field_id,
          courseData.title,
          courseData.slug,
          courseData.description
        ])
      );
    });
  });

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      const updateData = {
        title: 'Updated Course',
        description: 'Updated Description'
      };

      const mockUpdatedCourse = { id: 1, ...updateData };
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedCourse] });

      const result = await courseModel.updateCourse(1, updateData);

      expect(result).toEqual(mockUpdatedCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        expect.arrayContaining([updateData.title, updateData.description, 1])
      );
    });
  });

  describe('enrollUser', () => {
    it('should enroll user in course', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 123,
        course_id: 1,
        enrollment_type: 'course'
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockEnrollment] });

      const result = await courseModel.enrollUser(123, 1);

      expect(result).toEqual(mockEnrollment);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO enrollments'),
        [123, 1]
      );
    });
  });

  describe('getUserEnrollment', () => {
    it('should get user enrollment', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 123,
        course_id: 1
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockEnrollment] });

      const result = await courseModel.getUserEnrollment(123, 1);

      expect(result).toEqual(mockEnrollment);
    });

    it('should return null if no enrollment', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await courseModel.getUserEnrollment(123, 1);

      expect(result).toBeNull();
    });
  });
});
