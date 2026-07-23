const { buildQualitySummary } = require('../src/utils/quality.utils');

describe('quality utilities', () => {
  test('calculates missing, duplicate, invalid counts and the weighted quality score', () => {
    const columns = [
      {
        id: 'column_email',
        ordinal: 1,
        name: 'Email',
        normalizedName: 'email',
        dataType: 'STRING',
        classifications: [
          {
            classificationLabel: {
              code: 'EMAIL',
            },
          },
        ],
      },
      {
        id: 'column_age',
        ordinal: 2,
        name: 'Age',
        normalizedName: 'age',
        dataType: 'NUMBER',
        classifications: [],
      },
    ];

    const summary = buildQualitySummary({
      headers: ['Email', 'Age'],
      dataRows: [
        ['alice@example.com', 33],
        ['', 34],
        ['alice@example.com', 33],
        ['bob@example.com', 'bad'],
      ],
      columns,
    });

    expect(summary.totalRows).toBe(4);
    expect(summary.totalColumns).toBe(2);
    expect(summary.missingCells).toBe(1);
    expect(summary.duplicateRows).toBe(1);
    expect(summary.invalidCells).toBe(1);
    expect(summary.columnStats[0]).toMatchObject({
      columnId: 'column_email',
      missingCount: 1,
      invalidCount: 0,
      classificationLabelCode: 'EMAIL',
    });
    expect(summary.columnStats[1]).toMatchObject({
      columnId: 'column_age',
      missingCount: 0,
      invalidCount: 1,
    });
    expect(summary.qualityScore).toBeCloseTo(83.93, 2);
    expect(summary.completenessScore).toBeCloseTo(87.5, 2);
    expect(summary.uniquenessScore).toBeCloseTo(75, 2);
    expect(summary.validityScore).toBeCloseTo(85.71, 2);
  });
});
