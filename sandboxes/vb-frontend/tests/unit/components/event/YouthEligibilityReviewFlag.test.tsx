import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import YouthEligibilityReviewFlag from '@/components/event/YouthEligibilityReviewFlag';

describe('YouthEligibilityReviewFlag', () => {
  it('renders nothing when server flag is false', () => {
    const { container } = render(
      <YouthEligibilityReviewFlag show={false} birthDate="2005-06-01" asOfDate="2026-06-01" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows review chip when server flag is true', () => {
    render(
      <YouthEligibilityReviewFlag show birthDate="2005-06-01" asOfDate="2026-06-01" />
    );
    expect(screen.getByText(/Review youth eligibility/i)).toBeInTheDocument();
    expect(screen.getByText(/age 21/i)).toBeInTheDocument();
  });
});
