import { RouteId } from '../app/routes.ts';

export interface SceneAsset {
  video: string;
  poster: string;
  position: string;
  title: string;
  motion: 'video' | 'still';
}

const base = '/assets/environment/';
const scene = (stem: string, position: string, title: string, motion: SceneAsset['motion']): SceneAsset => ({
  video: `${base}${stem}.mp4`, poster: `${base}${stem}.webp`, position, title, motion
});

export const SCENES: Record<RouteId, SceneAsset> = {
  world: scene('01_model_world', 'center 58%', 'Celestial observatory garden', 'video'),
  playground: scene('02_playground', 'center 47%', 'Living intelligence laboratory', 'video'),
  chat: { video: '/assets/chat_loop.mp4', poster: '/assets/chat-stage-v2.webp', position: 'center', title: 'Chat conservatory', motion: 'video' },
  trivia: scene('03_trivia', 'center 45%', 'Academy of curious minds', 'video'),
  arcade: scene('04_arcade', 'center 54%', 'Prism carnival', 'video'),
  research: scene('05_research', 'center 46%', 'Celestial research library', 'video'),
  architecture: scene('06_architecture', 'center 48%', 'Crystal computational observatory', 'video'),
  championship: scene('07_championship', 'center 52%', 'Grand Prism arena', 'video'),
  settings: scene('08_settings', 'center 47%', 'Cozy observatory control room', 'still')
};
