import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SideActionBracketDiagram from './SideActionBracketDiagram';
import type { Bracket, UserDisplayNames } from '../../utils/bracketEngine/types';
import { displayBracketNumber } from '../../utils/bracketDisplayNumber';

interface SideActionBracketViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionName: string;
  brackets: Bracket[];
  userDisplayNames?: UserDisplayNames;
  payouts?: { first: number; second: number };
  byePayouts?: { first: number; second: number };
  gameNumbers?: number[];
  /** When false, hide dollar amounts on the diagram. */
  showPayouts?: boolean;
  bracketNumberOffset?: number;
  emptyMessage?: string;
}

const SideActionBracketViewerModal: React.FC<SideActionBracketViewerModalProps> = ({
  isOpen,
  onClose,
  sideActionName,
  brackets,
  userDisplayNames = {},
  payouts,
  byePayouts,
  gameNumbers = [],
  showPayouts = true,
  bracketNumberOffset = 0,
  emptyMessage = 'No brackets have been generated yet. Use Generate brackets first.',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen, brackets.length]);

  const activeBracket = useMemo(
    () => brackets[activeIndex] ?? null,
    [activeIndex, brackets]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`View brackets — ${sideActionName}`}
      size="large"
      closeOnOutsideClick
    >
      {brackets.length === 0 ? (
        <p className="text-sm text-text-muted py-4">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {brackets.length} bracket{brackets.length === 1 ? '' : 's'} generated
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="lightbackground"
                size="small"
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                disabled={activeIndex <= 0}
              >
                Previous
              </Button>
              <label className="text-sm text-text">
                <span className="sr-only">Select bracket</span>
                <select
                  value={activeIndex}
                  onChange={(e) => setActiveIndex(Number(e.target.value))}
                  className="rounded-md border border-border bg-surface-light px-2 py-1 text-sm text-text"
                >
                  {brackets.map((bracket, index) => (
                    <option key={bracket.id} value={index}>
                      Bracket {displayBracketNumber(bracket, bracketNumberOffset, index)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="lightbackground"
                size="small"
                onClick={() =>
                  setActiveIndex((index) => Math.min(brackets.length - 1, index + 1))
                }
                disabled={activeIndex >= brackets.length - 1}
              >
                Next
              </Button>
            </div>
          </div>

          {activeBracket && (
            <SideActionBracketDiagram
              bracket={activeBracket}
              userDisplayNames={userDisplayNames}
              payouts={showPayouts ? payouts : undefined}
              byePayouts={showPayouts ? byePayouts : undefined}
              gameNumbers={gameNumbers}
              showPayouts={showPayouts}
              bracketNumberOffset={bracketNumberOffset}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default SideActionBracketViewerModal;
