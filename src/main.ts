function findCanvas(): HTMLCanvasElement {
  const element = document.getElementById('game');
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error('index.html has no <canvas id="game">');
  }
  return element;
}

findCanvas();
