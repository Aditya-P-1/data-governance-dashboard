const {
  classifyColumn,
  isAddressValue,
  isDateOfBirthValue,
  isEmailValue,
  isGovernmentIdValue,
  isNameValue,
  isPhoneValue,
} = require('../src/utils/classification.utils');

describe('classification utilities', () => {
  test('detects an email column from header and sample values', () => {
    const result = classifyColumn({
      name: 'Email Address',
      normalizedName: 'email_address',
      dataType: 'STRING',
      profileJson: {
        sampleValues: ['alice@example.com', 'bob@example.com', 'carol@test.org'],
      },
    });

    expect(result.bestMatch).toMatchObject({
      code: 'EMAIL',
      name: 'Email',
      level: 'CONFIDENTIAL',
    });
    expect(result.bestMatch.score).toBeGreaterThanOrEqual(result.bestMatch.threshold);
    expect(result.candidates[0].code).toBe('EMAIL');
  });

  test('does not classify an ordinary numeric column as sensitive', () => {
    const result = classifyColumn({
      name: 'Order Amount',
      normalizedName: 'order_amount',
      dataType: 'NUMBER',
      profileJson: {
        sampleValues: ['12', '14', '18'],
      },
    });

    expect(result.bestMatch).toBeNull();
    expect(result.candidates).toHaveLength(0);
  });

  test('keeps the primitive detection helpers aligned with the rule set', () => {
    expect(isEmailValue('alice@example.com')).toBe(true);
    expect(isPhoneValue('+1 555-123-4567')).toBe(true);
    expect(isNameValue('Alice Johnson')).toBe(true);
    expect(isGovernmentIdValue('123-45-6789')).toBe(true);
    expect(isAddressValue('221B Baker Street')).toBe(true);
    expect(isDateOfBirthValue('1990-05-20')).toBe(true);
  });
});
