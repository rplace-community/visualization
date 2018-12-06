/******* Communities state *******/
let loadingScreenState = {
  actualLine: 0,
  lines: [],
  interval: null,
};

const interTime = 5000;

function changeTrivia() {
  let triviaComp = document.getElementsByClassName('lds-trivia');
  if (triviaComp.length > 0) {

    loadingScreenState.actualLine = (loadingScreenState.actualLine + 1) % loadingScreenState.lines.length;
    triviaComp[0].innerHTML = loadingScreenState.lines[loadingScreenState.actualLine];

    triviaComp[0].className = "lds-trivia w3-animate-opacity";

    setTimeout(() => {
      let triviaComp = document.getElementsByClassName('lds-trivia');
      if (triviaComp.length > 0) {
        triviaComp[0].className = "lds-trivia w3-animate-transparent";
      }
    }, interTime * 0.8);

  } else {
    clearInterval(loadingScreenState.interval);
  }
};

function loadingScreenInit() {
  fetch("assets/txt/loadingtrivia.txt")
    .then(response => response.text())
    .then(data => {
      loadingScreenState.lines = data.split('\n');
      loadingScreenState.actualLine = Math.floor(Math.random()*loadingScreenState.lines.length);

      changeTrivia();
      loadingScreenState.interval = setInterval(changeTrivia, interTime);
    });
};

loadingScreenInit();
