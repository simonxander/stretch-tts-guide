// Workout Engine State Machine and Timer Loop
import * as tts from './tts.js';

export const States = {
  IDLE: 'IDLE',
  PREPARE: 'PREPARE',
  EXPLANATION: 'EXPLANATION',
  STRETCHING: 'STRETCHING',
  REST: 'REST',
  COMPLETED: 'COMPLETED',
};

// Internal engine state
let state = States.IDLE;
let currentRoutine = null;
let currentStepIndex = -1;
let timeRemaining = 0;
let stepDuration = 0;
let totalTimeElapsed = 0;

let timerInterval = null;
let breathingState = 'prepare'; // 'inhale', 'exhale', 'prepare', 'rest'
let breathingTime = 0; // seconds inside the current breath

// Callbacks registered by UI
let callbacks = {
  onStateChange: null, // (state, details)
  onTick: null, // (timeRemaining, percentComplete)
  onBreathing: null, // (breathingState, breathingTime)
  onComplete: null, // (summaryStats)
};

export function registerCallbacks(uiCallbacks) {
  callbacks = { ...callbacks, ...uiCallbacks };
}

export function getState() {
  return state;
}

export function getCurrentRoutine() {
  return currentRoutine;
}

export function getCurrentStep() {
  if (!currentRoutine || currentStepIndex < 0 || currentStepIndex >= currentRoutine.steps.length) {
    return null;
  }
  return currentRoutine.steps[currentStepIndex];
}

export function getNextStep() {
  if (
    !currentRoutine ||
    currentStepIndex < -1 ||
    currentStepIndex >= currentRoutine.steps.length - 1
  ) {
    return null;
  }
  return currentRoutine.steps[currentStepIndex + 1];
}

export function getStepIndex() {
  return currentStepIndex;
}

// Helper: Swap "左" and "右" in a string
function swapLeftRight(text) {
  if (!text) return text;
  return text
    .replace(/左/g, '__TEMP_LEFT__')
    .replace(/右/g, '左')
    .replace(/__TEMP_LEFT__/g, '右');
}

// Start a routine
export function startWorkout(routine) {
  stopWorkout();

  // Flatten routine steps based on repeats and bilateral sides
  const flattenedSteps = [];
  routine.steps.forEach((step) => {
    const repeat = step.repeat || 1;
    const bilateral = step.bilateral || false;

    const executions = [];
    if (bilateral) {
      for (let r = 1; r <= repeat; r++) {
        executions.push({ side: '右側', set: r, totalSets: repeat, isOpposite: false });
      }
      for (let r = 1; r <= repeat; r++) {
        executions.push({ side: '左側', set: r, totalSets: repeat, isOpposite: true });
      }
    } else {
      for (let r = 1; r <= repeat; r++) {
        executions.push({ side: null, set: r, totalSets: repeat, isOpposite: false });
      }
    }

    executions.forEach((exec, idx) => {
      const baseName = exec.isOpposite ? swapLeftRight(step.name) : step.name;
      const name = baseName;

      const ttsName = baseName;

      const clonedStep = {
        ...step,
        id: `${step.id}-exec-${idx}-${Date.now()}`,
        parentId: exec.side ? `${step.id}-${exec.side}` : step.id,
        name,
        ttsName,
        set: exec.set,
        totalSets: exec.totalSets,
        side: exec.side,
        instructions: Array.isArray(step.instructions)
          ? step.instructions.map((ins) => {
              let newIns = exec.isOpposite ? swapLeftRight(ins) : ins;
              if (newIns.includes(step.name)) {
                newIns = newIns.replace(step.name, name);
              } else if (exec.isOpposite && newIns.includes(baseName)) {
                newIns = newIns.replace(baseName, name);
              }
              return newIns;
            })
          : step.instructions,
        ttsCues: Array.isArray(step.ttsCues)
          ? step.ttsCues.map((cue) => {
              let newText = exec.isOpposite ? swapLeftRight(cue.text) : cue.text;
              if (cue.time === 0) {
                if (newText.includes(step.name)) {
                  newText = newText.replace(step.name, ttsName);
                } else if (exec.isOpposite && newText.includes(baseName)) {
                  newText = newText.replace(baseName, ttsName);
                } else {
                  newText = `${ttsName}。` + newText;
                }
                
                // Remove legacy "下一個動作是：" prefixes dynamically for backward compatibility
                newText = newText.replace(/下一個動作[是，：]*\s*/g, '');
              }
              return { ...cue, text: newText };
            })
          : [{ time: 0, text: `${ttsName}。` }],
      };
      flattenedSteps.push(clonedStep);
    });
  });

  currentRoutine = {
    ...routine,
    steps: flattenedSteps,
  };
  currentStepIndex = 0;
  totalTimeElapsed = 0;

  transitionTo(States.PREPARE);
}

// Pause workout
export function pauseWorkout() {
  if (state === States.IDLE || state === States.COMPLETED) return;

  clearInterval(timerInterval);
  timerInterval = null;

  tts.pauseSpeaking();
}

// Resume workout
export function resumeWorkout() {
  if (state === States.IDLE || state === States.COMPLETED) return;
  if (timerInterval) return; // already running

  tts.resumeSpeaking();
  startTimerLoop();
}

// Stop/Quit workout
export function stopWorkout() {
  clearInterval(timerInterval);
  timerInterval = null;

  state = States.IDLE;
  currentRoutine = null;
  currentStepIndex = -1;
  timeRemaining = 0;
  stepDuration = 0;
  totalTimeElapsed = 0;
  breathingState = 'prepare';

  tts.stopSpeaking();

  if (callbacks.onStateChange) {
    callbacks.onStateChange(state, { routine: null, step: null, stepIndex: -1 });
  }
}

// Skip to next phase / step
export function skipNext() {
  if (state === States.IDLE || state === States.COMPLETED) return;

  tts.stopSpeaking();

  const currentStep = getCurrentStep();

  if (state === States.PREPARE) {
    // Skip initial prepare warmup to first action explanation
    currentStepIndex = 0;
    transitionTo(States.EXPLANATION);
  } else if (state === States.EXPLANATION) {
    // Skip explanation straight to stretching
    transitionTo(States.STRETCHING);
  } else if (state === States.STRETCHING) {
    if (currentStepIndex < currentRoutine.steps.length - 1) {
      const nextStep = currentRoutine.steps[currentStepIndex + 1];
      if (nextStep.parentId !== currentStep.parentId) {
        currentStepIndex++;
        transitionTo(States.EXPLANATION);
      } else {
        currentStepIndex++;
        transitionTo(States.REST);
      }
    } else {
      transitionTo(States.COMPLETED);
    }
  } else if (state === States.REST) {
    // Skip rest countdown directly to stretching
    transitionTo(States.STRETCHING);
  }
}

// Go back to previous step
export function skipPrev() {
  if (state === States.IDLE || state === States.COMPLETED) return;

  tts.stopSpeaking();

  const currentStep = getCurrentStep();

  if (state === States.STRETCHING) {
    if (currentStepIndex > 0) {
      const prevStep = currentRoutine.steps[currentStepIndex - 1];
      currentStepIndex--;
      if (prevStep.parentId !== currentStep.parentId) {
        transitionTo(States.EXPLANATION);
      } else {
        transitionTo(States.REST);
      }
    } else {
      transitionTo(States.PREPARE);
    }
  } else if (state === States.REST || state === States.EXPLANATION) {
    // Return to the stretching phase of the current step
    transitionTo(States.STRETCHING);
  }
}

// Transition state machine
function transitionTo(newState) {
  // Identify the step we just completed (before changing state variable)
  let completedStep = null;
  if (state === States.STRETCHING) {
    if (newState === States.REST || newState === States.EXPLANATION) {
      completedStep = currentRoutine.steps[currentStepIndex - 1];
    } else if (newState === States.COMPLETED) {
      completedStep = currentRoutine.steps[currentStepIndex];
    }
  }

  // Check if completed step has a relaxation cue at time === duration
  let relaxationText = '';
  if (completedStep && Array.isArray(completedStep.ttsCues)) {
    const endCue = completedStep.ttsCues.find((c) => c.time === completedStep.duration);
    if (endCue) {
      relaxationText = endCue.text;
    }
  }

  state = newState;
  clearInterval(timerInterval);
  timerInterval = null;

  const currentStep = getCurrentStep();
  const nextStep = getNextStep();

  let delayTimerLoop = false;

  if (state === States.PREPARE) {
    timeRemaining = 10;
    stepDuration = 10;
    breathingState = 'prepare';

    // Play transition chime
    tts.playChime(523.25, 'triangle', 0.3); // C5 note

    // Play TTS greeting
    if (currentRoutine) {
      tts.speak(`開始伸展流程：${currentRoutine.name}。請準備。`);
    }
  } else if (state === States.EXPLANATION) {
    timeRemaining = 0;
    stepDuration = 0;
    breathingState = 'prepare';

    // Play transition chime
    tts.playChime(523.25, 'triangle', 0.3); // C5 note

    if (currentStep) {
      const initialCue = currentStep.ttsCues.find((c) => c.time === 0);
      const explanationText = initialCue
        ? initialCue.text
        : `${currentStep.ttsName || currentStep.name}。`;

      // Prepend relaxation text from completed action if present
      const finalSpeakText = relaxationText
        ? `${relaxationText}。${explanationText}`
        : explanationText;

      tts.speak(finalSpeakText, () => {
        if (state === States.EXPLANATION) {
          transitionTo(States.STRETCHING); // Transition directly to stretching!
        }
      });
    }
  } else if (state === States.STRETCHING) {
    timeRemaining = currentStep.duration;
    stepDuration = currentStep.duration;
    breathingState = 'inhale';
    breathingTime = 0;

    // Play chime
    tts.playChime(659.25, 'sine', 0.4); // E5 note

    delayTimerLoop = true;
    tts.speak('開始。', () => {
      if (state === States.STRETCHING && !timerInterval) {
        startTimerLoop();
      }
    });

  } else if (state === States.REST) {
    // 3 seconds rest between sets of the same side/action
    let restDuration = 3;

    timeRemaining = restDuration;
    stepDuration = restDuration;
    breathingState = 'rest';

    // Play soft completion chime
    tts.playChime(440.0, 'sine', 0.5); // A4 note

    // Speak "休息" (Rest) - No side change voice announcement as requested
    const restAnnouncement = '休息。';

    // Prepend relaxation text from completed set if present
    const finalSpeakText = relaxationText
      ? `${relaxationText}。${restAnnouncement}`
      : restAnnouncement;
    tts.speak(finalSpeakText);
  } else if (state === States.COMPLETED) {
    // Workout finished!
    tts.playChime(880.0, 'sine', 0.8); // A5 chime
    setTimeout(() => {
      const completedText = `做得太棒了！您已完成本次伸展流程。`;
      const finalSpeakText = relaxationText ? `${relaxationText}。${completedText}` : completedText;
      tts.speak(finalSpeakText);
    }, 800);

    if (callbacks.onComplete) {
      callbacks.onComplete({
        totalTime: totalTimeElapsed,
        stepCount: currentRoutine.steps.length,
      });
    }
    return;
  }

  // Notify UI of state transition
  if (callbacks.onStateChange) {
    callbacks.onStateChange(state, {
      routine: currentRoutine,
      step: currentStep,
      stepIndex: currentStepIndex,
      nextStep: nextStep,
    });
  }

  // Notify UI of initial tick
  if (callbacks.onTick) {
    callbacks.onTick(timeRemaining, 100);
  }

  if (callbacks.onBreathing) {
    callbacks.onBreathing(breathingState, 0);
  }

  // Trigger warning beep if duration is exactly 3 seconds
  if (timeRemaining === 3 && !delayTimerLoop) {
    tts.playChime(523.25, 'triangle', 0.1);
  }

  // Start the timer loop conditionally
  if (!delayTimerLoop) {
    startTimerLoop();
  }
}

// Primary 1-second interval loop
function startTimerLoop() {
  timerInterval = setInterval(() => {
    tick();
  }, 1000);
}

// Logic processed every second
function tick() {
  if (state === States.IDLE || state === States.COMPLETED) {
    clearInterval(timerInterval);
    return;
  }

  if (state === States.EXPLANATION) {
    return;
  }

  timeRemaining--;

  // Trigger warning sound on last 3 seconds of timed states (PREPARE, STRETCHING, REST)
  if (timeRemaining <= 3 && timeRemaining > 0) {
    tts.playChime(523.25, 'triangle', 0.1); // Quick short C5 beep
  }

  if (state === States.STRETCHING) {
    totalTimeElapsed++;

    // Process breathing cycle
    updateBreathingCycle();

    // Check for TTS cues based on countdown elapsed time
    const currentStep = getCurrentStep();
    if (currentStep) {
      const elapsed = currentStep.duration - timeRemaining;

      // Look for matches in the cue script list
      const cue = currentStep.ttsCues.find((c) => c.time === elapsed);
      if (cue) {
        tts.speak(cue.text);
      }
    }
  }

  // Update UI timer
  if (callbacks.onTick) {
    const percent = (timeRemaining / stepDuration) * 100;
    callbacks.onTick(timeRemaining, percent);
  }

  // Check if timer expired
  if (timeRemaining <= 0) {
    handlePhaseExpiry();
  }
}

// Update the rhythmic breathing cycle (4s inhale / 4s exhale)
function updateBreathingCycle() {
  breathingTime = (breathingTime + 1) % 8;

  const newBreathingState = breathingTime < 4 ? 'inhale' : 'exhale';

  if (newBreathingState !== breathingState) {
    breathingState = newBreathingState;

    // Optional soft pitch chime when switching breathing states to guide eyes-free users
    if (breathingState === 'inhale') {
      tts.playChime(329.63, 'sine', 0.15); // E4 note
    } else {
      tts.playChime(261.63, 'sine', 0.15); // C4 note
    }
  }

  if (callbacks.onBreathing) {
    // pass current cycle phase percent (0 to 100% inside the 4-second breath)
    const breathProgress = (breathingTime % 4) / 4;
    callbacks.onBreathing(breathingState, breathProgress);
  }
}

// Transition to next state when timer hits 0
function handlePhaseExpiry() {
  if (state === States.PREPARE) {
    currentStepIndex = 0;
    transitionTo(States.EXPLANATION);
  } else if (state === States.STRETCHING) {
    if (currentStepIndex < currentRoutine.steps.length - 1) {
      const currentStep = currentRoutine.steps[currentStepIndex];
      const nextStep = currentRoutine.steps[currentStepIndex + 1];
      if (nextStep.parentId !== currentStep.parentId) {
        currentStepIndex++;
        transitionTo(States.EXPLANATION);
      } else {
        currentStepIndex++;
        transitionTo(States.REST);
      }
    } else {
      transitionTo(States.COMPLETED);
    }
  } else if (state === States.REST) {
    // Rest expired -> transition to stretching
    transitionTo(States.STRETCHING);
  }
}
