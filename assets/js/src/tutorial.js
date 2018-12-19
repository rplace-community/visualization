

function initTutorial() {
    tutorialState = TutorialStates.Start;
}


function endTutorial() {
    tutorialState = TutorialStates.End;
}


function nextTutorialStep() {
    tutorialState = Math.min(tutorialState + 1, TutorialStates.End);
}

function showTutorialStep() {
    
}