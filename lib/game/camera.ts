import { CAMERA_LERP, CAMERA_LOOKAHEAD, CAMERA_Y_OFFSET } from './constants';

// Camera position = world coordinate shown at the viewport's top-left corner.
export type Camera = {
  x: number;
  y: number;
  follow: (
    targetX: number,
    targetY: number,
    velX: number,
    viewW: number,
    viewH: number,
    worldWidth: number,
    floorY: number,
  ) => void;
};

export function createCamera(initX = 0, initY = 0): Camera {
  const cam: Camera = {
    x: initX,
    y: initY,
    follow(targetX, targetY, velX, viewW, viewH, worldWidth, floorY) {
      // Keep the bike ~35% from the left, looking ahead in the travel direction.
      const lookahead = Math.sign(velX) * Math.min(Math.abs(velX) * 12, CAMERA_LOOKAHEAD);
      let desiredX = targetX + lookahead - viewW * 0.35;
      let desiredY = targetY + CAMERA_Y_OFFSET - viewH * 0.5;

      // Clamp so we never scroll past the world edges or far below the floor.
      desiredX = Math.max(0, Math.min(desiredX, Math.max(0, worldWidth - viewW)));
      desiredY = Math.min(desiredY, floorY - viewH + 60);

      cam.x += (desiredX - cam.x) * CAMERA_LERP;
      cam.y += (desiredY - cam.y) * CAMERA_LERP;
    },
  };
  return cam;
}
