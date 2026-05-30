// Workout Engine State Machine and Timer Loop
import * as tts from './tts.js';

export const States = {
  IDLE: 'IDLE',
  PREPARE: 'PREPARE',
  STRETCHING: 'STRETCHING',
  REST: 'REST',
  COMPLETED: 'COMPLETED'
};

// Internal engine state
let state = States.IDLE;
let currentRoutine = null;
let currentStepIndex = -1;
let timeRemaining = 0;
let stepDuration = 0;
let totalTimeElapsed = 0;
let lastSecondCount = 0;

let timerInterval = null;
let breathingInterval = null;
let breathingState = 'prepare'; // 'inhale', 'exhale', 'prepare', 'rest'
let breathingTime = 0; // seconds inside the current breath

// Callbacks registered by UI
let callbacks = {
  onStateChange: null, // (state, details)
  onTick: null,        // (timeRemaining, percentComplete)
  onBreathing: null,   // (breathingState, breathingTime)
  onComplete: null     // (summaryStats)
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
  if (!currentRoutine || currentStepIndex < -1 || currentStepIndex >= currentRoutine.steps.length - 1) {
    return null;
  }
  return currentRoutine.steps[currentStepIndex + 1];
}

export function getStepIndex() {
  return currentStepIndex;
}

// Start a routine
export function startWorkout(routine) {
  stopWorkout();
  
  // Flatten routine steps based on repeats and bilateral sides
  const flattenedSteps = [];
  routine.steps.forEach(step => {
    const repeat = step.repeat || 1;
    const bilateral = step.bilateral || false;
    
    const executions = [];
    if (bilateral) {
      for (let r = 1; r <= repeat; r++) {
        executions.push({ side: '右側', set: r, totalSets: repeat });
        executions.push({ side: '左側', set: r, totalSets: repeat });
      }
    } else {
      for (let r = 1; r <= repeat; r++) {
        executions.push({ side: null, set: r, totalSets: repeat });
      }
    }
    
    executions.forEach((exec, idx) => {
      const setSuffix = exec.totalSets > 1 ? ` (第 ${exec.set}/${exec.totalSets} 組)` : '';
      const sideSuffix = exec.side ? ` (${exec.side})` : '';
      
      const clonedStep = {
        ...step,
        id: `${step.id}-exec-${idx}-${Date.now()}`,
        name: `${step.name}${sideSuffix}${setSuffix}`,
        instructions: Array.isArray(step.instructions)
          ? step.instructions.map(ins => {
              let newIns = ins;
              if (newIns.includes(step.name)) {
                newIns = newIns.replace(step.name, `${step.name}${sideSuffix}${setSuffix}`);
              }
              return newIns;
            })
          : step.instructions,
        ttsCues: Array.isArray(step.ttsCues)
          ? step.ttsCues.map(cue => {
              if (cue.time === 0) {
                let newText = cue.text;
                const repText = exec.side 
                  ? (exec.totalSets > 1 ? `${step.name}，${exec.side}，第 ${exec.set} 組` : `${step.name}，${exec.side}`)
                  : (exec.totalSets > 1 ? `${step.name}，第 ${exec.set} 組` : `${step.name}`);
                  
                if (newText.includes(step.name)) {
                  newText = newText.replace(step.name, repText);
                } else {
                  newText = `下一個動作是：${repText}。` + newText;
                }
                return { ...cue, text: newText };
              }
              return { ...cue };
            })
          : [{ time: 0, text: `下一個動作是：${step.name}${sideSuffix}${setSuffix}。` }]
      };
      flattenedSteps.push(clonedStep);
    });
  });

  currentRoutine = {
    ...routine,
    steps: flattenedSteps
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
  
  if (state === States.PREPARE) {
    // Skip warm up directly to stretching
    transitionTo(States.STRETCHING);
  } else if (state === States.STRETCHING) {
    // If there is another step, go to rest, otherwise complete
    if (currentStepIndex < currentRoutine.steps.length - 1) {
      transitionTo(States.REST);
    } else {
      transitionTo(States.COMPLETED);
    }
  } else if (state === States.REST) {
    // Skip rest directly to next stretch
    currentStepIndex++;
    transitionTo(States.STRETCHING);
  }
}

// Go back to previous step
export function skipPrev() {
  if (state === States.IDLE || state === States.COMPLETED) return;
  
  tts.stopSpeaking();
  
  if (state === States.STRETCHING) {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      transitionTo(States.STRETCHING);
    } else {
      // If at step 0, restart the preparation
      transitionTo(States.PREPARE);
    }
  } else if (state === States.REST || state === States.PREPARE) {
    // If in REST, go back to active stretch of the current step
    transitionTo(States.STRETCHING);
  }
}

// Transition state machine
function transitionTo(newState) {
  state = newState;
  clearInterval(timerInterval);
  timerInterval = null;
  
  const currentStep = getCurrentStep();
  const nextStep = getNextStep();
  
  lastSecondCount = -1; // Reset trigger safeguard
  
  if (state === States.PREPARE) {
    timeRemaining = 10; // 10 second intro countdown
    stepDuration = 10;
    breathingState = 'prepare';
    
    // Play transition chime
    tts.playChime(523.25, 'triangle', 0.3); // C5 note
    
    // Play TTS greeting
    if (currentRoutine && currentStep) {
      tts.speak(`開始伸展流程：${currentRoutine.name}。請準備進行第一個動作：${currentStep.name}。`);
    }
    
  } else if (state === States.STRETCHING) {
    timeRemaining = currentStep.duration;
    stepDuration = currentStep.duration;
    breathingState = 'inhale';
    breathingTime = 0;
    
    // Play chime
    tts.playChime(659.25, 'sine', 0.4); // E5 note
    
    // Play initial stretch audio
    const initialCue = currentStep.ttsCues.find(c => c.time === 0);
    if (initialCue) {
      tts.speak(initialCue.text);
    } else {
      tts.speak(`開始進行：${currentStep.name}。`);
    }
    
  } else if (state === States.REST) {
    timeRemaining = 8; // 8-second rest transition
    stepDuration = 8;
    breathingState = 'rest';
    
    // Play soft completion chime
    tts.playChime(440.00, 'sine', 0.5); // A4 note
    
    if (nextStep) {
      tts.speak(`休息。下一個動作是：${nextStep.name}。`);
    } else {
      tts.speak(`休息。即將結束。`);
    }
    
  } else if (state === States.COMPLETED) {
    // Workout finished!
    tts.playChime(880.00, 'sine', 0.8); // A5 chime
    setTimeout(() => {
      tts.speak(`做得太棒了！您已完成本次伸展流程。`);
    }, 800);
    
    if (callbacks.onComplete) {
      callbacks.onComplete({
        totalTime: totalTimeElapsed,
        stepCount: currentRoutine.steps.length
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
      nextStep: nextStep
    });
  }
  
  // Notify UI of initial tick
  if (callbacks.onTick) {
    callbacks.onTick(timeRemaining, 100);
  }
  
  if (callbacks.onBreathing) {
    callbacks.onBreathing(breathingState, 0);
  }
  
  // Start the timer loop
  startTimerLoop();
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
  
  timeRemaining--;
  
  if (state === States.STRETCHING) {
    totalTimeElapsed++;
    
    // Process breathing cycle
    updateBreathingCycle();
    
    // Check for TTS cues based on countdown elapsed time
    const currentStep = getCurrentStep();
    if (currentStep) {
      const elapsed = currentStep.duration - timeRemaining;
      
      // Look for matches in the cue script list
      const cue = currentStep.ttsCues.find(c => c.time === elapsed);
      if (cue) {
        tts.speak(cue.text);
      }
    }
  }
  
  // Trigger warning sound on last 3 seconds of stretching/resting
  if (timeRemaining <= 3 && timeRemaining > 0) {
    tts.playChime(523.25, 'triangle', 0.1); // Quick short C5 beep
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
    transitionTo(States.STRETCHING);
  } else if (state === States.STRETCHING) {
    // If there are more steps, go to rest, otherwise complete
    if (currentStepIndex < currentRoutine.steps.length - 1) {
      transitionTo(States.REST);
    } else {
      transitionTo(States.COMPLETED);
    }
  } else if (state === States.REST) {
    // Go to next exercise
    currentStepIndex++;
    transitionTo(States.STRETCHING);
  }
}
