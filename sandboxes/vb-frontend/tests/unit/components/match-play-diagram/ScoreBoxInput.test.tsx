import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ScoreBoxInput from '../../../../src/components/match-play-diagram/shared/ScoreBoxInput';

afterEach(() => cleanup());

describe('ScoreBoxInput', () => {
  it('does not call onChange on each keystroke; commits on blur', () => {
    const onChange = vi.fn();
    render(<ScoreBoxInput value={null} onChange={onChange} ariaLabel="score" />);
    const input = screen.getByLabelText('score');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.change(input, { target: { value: '22' } });
    fireEvent.change(input, { target: { value: '226' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(226);
  });

  it('does not re-commit unchanged values on blur', () => {
    const onChange = vi.fn();
    render(<ScoreBoxInput value={200} onChange={onChange} ariaLabel="score-b" />);
    const input = screen.getByLabelText('score-b');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });
});
