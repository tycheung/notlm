/**
 * Utilities for calculating bowling scores
 */

/**
 * Converts a frame mark (X, /, etc.) to a numeric value
 * @param mark The bowling mark
 * @returns Number value of the mark
 */
export const markToValue = (mark: string | null | undefined): number => {
  if (!mark) return 0;
  if (mark === 'X') return 10;
  if (mark === '/') return 10; // This is context-dependent and needs proper handling
  if (mark === '-') return 0;
  return parseInt(mark, 10) || 0;
};

/**
 * Parse a frame-by-frame string into individual frame marks
 * @param frameByFrame The frame-by-frame string (e.g. "X,7/,81,...")
 * @returns Array of frame data
 */
export const parseFrameByFrameString = (frameByFrame: string): string[][] => {
  if (!frameByFrame) return [];
  
  return frameByFrame.split(',').map(frame => {
    // Handle special case for 10th frame which can have 3 marks
    if (frame.length === 3) {
      return [frame[0], frame[1], frame[2]];
    } else if (frame.length === 2) {
      return [frame[0], frame[1]];
    } else if (frame.length === 1) {
      return [frame[0]];
    }
    return [];
  });
};

/**
 * Get the value of a specific ball
 * @param frames Parsed frames array
 * @param frameIndex Index of the frame (0-9)
 * @param ballIndex Index of the ball in the frame (0-2)
 * @returns Numeric value of the ball
 */
export const getBallValue = (frames: string[][], frameIndex: number, ballIndex: number): number => {
  if (!frames[frameIndex] || !frames[frameIndex][ballIndex]) return 0;
  
  const mark = frames[frameIndex][ballIndex];
  
  // Handle spare calculation ('/' depends on previous ball)
  if (mark === '/') {
    const prevBallValue = ballIndex > 0 ? markToValue(frames[frameIndex][ballIndex - 1]) : 0;
    return 10 - prevBallValue;
  }
  
  return markToValue(mark);
};

/**
 * Calculate the score for a frame including bonus pins from strikes/spares
 * @param frames Parsed frames array
 * @param frameIndex Index of the frame to calculate (0-9)
 * @returns Score for the frame
 */
export const calculateFrameScore = (frames: string[][], frameIndex: number): number => {
  if (!frames[frameIndex]) return 0;
  
  const firstBall = frames[frameIndex][0];
  const secondBall = frames[frameIndex][1];
  const thirdBall = frames[frameIndex][2]; // Only for 10th frame
  
  // Base score for the frame
  let score = 0;
  
  // Strike
  if (firstBall === 'X') {
    score = 10;
    
    // Add bonus from next two balls
    if (frameIndex < 9) {
      // Next frame's first ball
      const nextFrameFirstBall = frames[frameIndex + 1]?.[0];
      score += markToValue(nextFrameFirstBall);
      
      // Next ball after strike
      if (nextFrameFirstBall === 'X' && frameIndex < 8) {
        // If next ball is also a strike, look to the frame after or the second ball of next frame
        score += markToValue(frames[frameIndex + 2]?.[0]);
      } else {
        // Otherwise, take the second ball of the next frame
        score += getBallValue(frames, frameIndex + 1, 1);
      }
    } else {
      // 10th frame: add the next two balls in the same frame
      score += getBallValue(frames, frameIndex, 1);
      score += getBallValue(frames, frameIndex, 2);
    }
  } 
  // Spare
  else if (secondBall === '/') {
    score = 10;
    
    // Add bonus from next ball
    if (frameIndex < 9) {
      score += markToValue(frames[frameIndex + 1]?.[0]);
    } else {
      // 10th frame: add the third ball in the same frame
      score += getBallValue(frames, frameIndex, 2);
    }
  } 
  // Open frame
  else {
    score += markToValue(firstBall);
    score += markToValue(secondBall);
  }
  
  return score;
};

/**
 * Calculate the cumulative score after each frame
 * @param frameByFrame Frame-by-frame string
 * @returns Array of cumulative scores
 */
export const calculateBowlingScore = (frameByFrame: string): number[] => {
  const frames = parseFrameByFrameString(frameByFrame);
  const scores: number[] = [];
  let cumulativeScore = 0;
  
  for (let i = 0; i < Math.min(frames.length, 10); i++) {
    const frameScore = calculateFrameScore(frames, i);
    cumulativeScore += frameScore;
    scores.push(cumulativeScore);
  }
  
  return scores;
};

/**
 * Count strikes in a game
 * @param frameByFrame Frame-by-frame string
 * @returns Number of strikes
 */
export const countStrikes = (frameByFrame: string): number => {
  const frames = parseFrameByFrameString(frameByFrame);
  let strikes = 0;
  
  frames.forEach((frame, index) => {
    if (frame[0] === 'X') strikes++;
    // Count additional strikes in 10th frame
    if (index === 9) {
      if (frame[1] === 'X') strikes++;
      if (frame[2] === 'X') strikes++;
    }
  });
  
  return strikes;
};

/**
 * Count spares in a game
 * @param frameByFrame Frame-by-frame string
 * @returns Number of spares
 */
export const countSpares = (frameByFrame: string): number => {
  const frames = parseFrameByFrameString(frameByFrame);
  let spares = 0;
  
  frames.forEach((frame, index) => {
    if (frame[0] !== 'X' && frame[1] === '/') spares++;
    // Count additional spare in 10th frame
    if (index === 9 && frame[0] === 'X' && frame[1] !== 'X' && frame[2] === '/') spares++;
    if (index === 9 && frame[1] === '/' && frame[2]) spares++;
  });
  
  return spares;
};

/**
 * Count open frames in a game
 * @param frameByFrame Frame-by-frame string
 * @returns Number of open frames
 */
export const countOpenFrames = (frameByFrame: string): number => {
  const frames = parseFrameByFrameString(frameByFrame);
  let opens = 0;
  
  frames.forEach((frame, index) => {
    // An open frame is one without a strike or spare
    if (frame[0] !== 'X' && frame[1] !== '/') {
      opens++;
    }
  });
  
  return opens;
};

/**
 * Calculate the maximum possible score from current frame state
 * @param frameByFrame Frame-by-frame string
 * @returns Maximum possible score
 */
export const calculateMaxPossibleScore = (frameByFrame: string): number => {
  const frames = parseFrameByFrameString(frameByFrame);
  const currentScore = calculateBowlingScore(frameByFrame);
  
  // If all 10 frames are complete, return the final score
  if (frames.length === 10 && frames[9].length >= 2 && 
     (frames[9][0] !== 'X' && frames[9][1] !== '/' || frames[9].length === 3)) {
    return currentScore[9];
  }
  
  // Otherwise calculate the maximum possible score by assuming strikes for remaining balls
  let maxScore = currentScore.length > 0 ? currentScore[currentScore.length - 1] : 0;
  
  // Add remaining frames (assuming all strikes)
  for (let i = frames.length; i < 10; i++) {
    maxScore += 30; // Strike + 2 bonus strikes = 30
  }
  
  // Handle incomplete last frame
  if (frames.length === 10 && frames[9].length < 3) {
    if (frames[9][0] === 'X') {
      if (frames[9].length === 1) {
        maxScore += 20; // Two more strikes
      } else if (frames[9].length === 2) {
        maxScore += 10; // One more strike
      }
    } else if (frames[9].length === 1) {
      maxScore += 10; // Spare + strike
    }
  }
  
  return maxScore;
}; 