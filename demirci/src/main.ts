import './styles.css';
import { Game } from './game';
import { Scene } from './scene';
import { Synth } from './synth';
import { UI } from './ui';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const scene = new Scene(canvas);
const synth = new Synth();
const game = new Game();
const ui = new UI(game);

game.onChange = (s) => {
  scene.setItem(s.phase === 'title' ? null : s.item);
  ui.render(s);
};

game.onEvent = (e) => {
  switch (e) {
    case 'perfect':
      synth.perfect();
      scene.burst('perfect');
      break;
    case 'good':
      synth.good();
      scene.burst('good');
      break;
    case 'miss':
      synth.miss();
      scene.burst('miss');
      break;
    case 'burn':
      synth.burn();
      scene.burst('burn');
      break;
    case 'deliver':
      synth.coin();
      scene.burst('deliver');
      break;
    case 'auction-sold':
      synth.coin();
      scene.burst('deliver');
      break;
    case 'auction-failed':
      synth.burn();
      break;
    case 'day':
      synth.click();
      break;
    case 'click':
      synth.click();
      break;
    default:
      break;
  }
};

let heartbeatOn = false;

function frame(t: number): void {
  scene.render(t);
  ui.tick(t, game.state);
  game.tick(t);

  const s = game.state;
  const wantHeart = s.phase === 'strike' && (s.item?.tier ?? 0) >= 7;
  if (wantHeart && !heartbeatOn) {
    synth.setHeartTempo(58 + (s.item?.tier ?? 7) * 6);
    synth.heartbeat();
    heartbeatOn = true;
  } else if (!wantHeart && heartbeatOn) {
    synth.stopHeartbeat();
    heartbeatOn = false;
  }

  requestAnimationFrame(frame);
}

const unlock = () => {
  synth.ensure();
  document.removeEventListener('pointerdown', unlock);
  document.removeEventListener('keydown', unlock);
};
document.addEventListener('pointerdown', unlock);
document.addEventListener('keydown', unlock);

scene.setItem(null);
ui.render(game.state);
requestAnimationFrame(frame);

// hata ayıklama / otomatik test kancası
(window as unknown as { __game: Game }).__game = game;
