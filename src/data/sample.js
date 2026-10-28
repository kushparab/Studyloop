/**
 * StudyLoop Sample Data & Fallback Cache
 *
 * Strict shapes:
 * - Deadline: { id, title, type, subject, dueDate, confidence, sourceSnippet }
 * - Topic:    { id, subject, name, weight, difficulty, examDate, mastery }
 * - Question: { id, topicId, question, options, correctIndex, explanation, conceptTag }
 * - Mistake:  { id, questionId, topicId, userAnswerIndex, type, reason, fixTip, practice }
 */

export const SAMPLE_RAW_TEXT = `CS 101 Midterm Exam on Nov 4 covering Recursion, Dynamic Programming, and Graph Traversals.
Math 205 Quiz on Nov 2 covering Matrix Inverses and Eigenvalues.
Physics 101 Problem Set due Nov 3 covering Rotational Kinematics.
CS 101 Project submission next Friday (tentative).`;

export const SAMPLE_EXTRACT_RESPONSE = {
  deadlines: [
    {
      id: 'd-1',
      title: 'Math 205 Quiz',
      type: 'quiz',
      subject: 'Math 205',
      dueDate: '2026-11-02',
      confidence: 0.95,
      sourceSnippet: 'Math 205 Quiz on Nov 2'
    },
    {
      id: 'd-2',
      title: 'Physics 101 Problem Set',
      type: 'assignment',
      subject: 'Physics 101',
      dueDate: '2026-11-03',
      confidence: 0.92,
      sourceSnippet: 'Physics 101 Problem Set due Nov 3'
    },
    {
      id: 'd-3',
      title: 'CS 101 Midterm Exam',
      type: 'exam',
      subject: 'CS 101',
      dueDate: '2026-11-04',
      confidence: 0.98,
      sourceSnippet: 'CS 101 Midterm Exam on Nov 4'
    },
    {
      id: 'd-4',
      title: 'CS 101 Project submission',
      type: 'assignment',
      subject: 'CS 101',
      dueDate: null,
      confidence: 0.45,
      sourceSnippet: 'CS 101 Project submission next Friday (tentative)'
    }
  ],
  topics: [
    {
      id: 't-1',
      subject: 'Math 205',
      name: 'Matrix Inverses and Eigenvalues',
      weight: 3,
      difficulty: 3,
      examDate: '2026-11-02',
      mastery: 0.3
    },
    {
      id: 't-2',
      subject: 'Physics 101',
      name: 'Rotational Kinematics',
      weight: 2,
      difficulty: 2,
      examDate: '2026-11-03',
      mastery: 0.4
    },
    {
      id: 't-3',
      subject: 'CS 101',
      name: 'Dynamic Programming & Memoization',
      weight: 5,
      difficulty: 4,
      examDate: '2026-11-04',
      mastery: 0.2
    }
  ],
  warnings: [
    'Ambiguous date: "next Friday (tentative)" for CS 101 Project could not be resolved with certainty. dueDate set to null.'
  ]
};

export const SAMPLE_QUIZ_RESPONSE = {
  questions: [
    {
      id: 'q-1',
      topicId: 't-3',
      question: 'What is the primary difference between memoization and tabulation in Dynamic Programming?',
      options: [
        'Memoization is top-down recursion with caching; tabulation is bottom-up iterative table filling.',
        'Tabulation requires exponential memory while memoization is always O(1).',
        'Memoization only works on greedy algorithm problems.',
        'There is no functional difference; they are exact synonyms.'
      ],
      correctIndex: 0,
      explanation: 'Memoization caches subproblem solutions top-down during recursion, while tabulation builds subproblem solutions iteratively from base cases.',
      conceptTag: 'DP Approaches'
    },
    {
      id: 'q-2',
      topicId: 't-3',
      question: 'Which property MUST a problem possess for Dynamic Programming to be applicable?',
      options: [
        'Strictly linear time complexity',
        'Optimal substructure and overlapping subproblems',
        'Graph acyclicity with no negative cycles',
        'Divide-and-conquer disjoint partitions'
      ],
      correctIndex: 1,
      explanation: 'DP applies specifically when optimal solutions to subproblems form the optimal overall solution and subproblems recur repeatedly.',
      conceptTag: 'DP Prerequisites'
    },
    {
      id: 'q-3',
      topicId: 't-3',
      question: 'In the 0/1 Knapsack problem with capacity W and N items, what is the standard time complexity of the DP table solution?',
      options: [
        'O(N log N)',
        'O(N * W)',
        'O(2^N)',
        'O(W^2)'
      ],
      correctIndex: 1,
      explanation: 'The standard dynamic programming grid computes N * W states in pseudo-polynomial O(N * W) time.',
      conceptTag: 'Complexity Analysis'
    },
    {
      id: 'q-4',
      topicId: 't-3',
      question: 'What occurs if you omit the base case in a recursive memoized DP implementation?',
      options: [
        'Automatic fallback to greedy choice',
        'Infinite recursion / stack overflow error',
        'The cache automatically infers the base value',
        'The complexity reduces to logarithmic'
      ],
      correctIndex: 1,
      explanation: 'Without base conditions, the recursion never terminates, exhausting call stack memory.',
      conceptTag: 'Base Cases'
    },
    {
      id: 'q-5',
      topicId: 't-3',
      question: 'When is Space Optimization (state reduction) typically possible in a 2D DP problem?',
      options: [
        'When the current row depends only on the immediately preceding row',
        'When the target value is negative',
        'Only when the matrix is symmetric',
        'Never; 2D tables cannot be compressed'
      ],
      correctIndex: 0,
      explanation: 'If computing dp[i][w] only references dp[i-1][...], we only need to store the previous row, reducing space from O(N*W) to O(W).',
      conceptTag: 'Space Optimization'
    }
  ]
};

export const SAMPLE_DIAGNOSE_RESPONSE = {
  mistakes: [
    {
      id: 'm-1',
      questionId: 'q-1',
      topicId: 't-3',
      userAnswerIndex: 1,
      type: 'concept_gap',
      reason: 'Confused iterative table memory consumption with recursive cache behavior.',
      fixTip: 'Draw a small 2x3 state table to visualize how tabulation fills rows iteratively without recursion overhead.',
      practice: [
        {
          id: 'p-1',
          topicId: 't-3',
          question: 'If a bottom-up DP table only uses row i-1 to compute row i, what is the best space complexity achievable?',
          options: ['O(1)', 'O(Columns)', 'O(Rows * Columns)', 'O(Rows^2)'],
          correctIndex: 1,
          explanation: 'Only the previous row needs to be maintained in memory.',
          conceptTag: 'Space Optimization'
        },
        {
          id: 'p-2',
          topicId: 't-3',
          question: 'Which approach avoids computing states that are unreachable from the initial call?',
          options: ['Top-down memoization', 'Bottom-up tabulation', 'Both equally', 'Neither'],
          correctIndex: 0,
          explanation: 'Top-down recursion only evaluates states reachable along actual recursive call paths.',
          conceptTag: 'DP Traversal'
        }
      ]
    }
  ]
};
