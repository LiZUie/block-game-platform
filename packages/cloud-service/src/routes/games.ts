import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticateToken, requireRole, requireActiveAccount, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole, GameManifest, GameSummary } from '@blockgame/shared';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'blockgame_cloud_super_secret_key_2026';

// 1. Get Game Catalog (Accessible by all roles & guests)
router.get('/', (req: Request, res: Response) => {
  const { authorId, publishedOnly } = req.query;

  let query = 'SELECT * FROM games WHERE 1=1';
  const params: any[] = [];

  if (publishedOnly !== 'false') {
    query += ' AND is_published = 1';
  }

  if (authorId) {
    query += ' AND author_id = ?';
    params.push(authorId);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];

  // Attach highest score
  const games: (GameSummary & { projectData?: any })[] = rows.map(r => {
    const topScoreRow = db.prepare('SELECT MAX(score) as maxScore FROM scores WHERE game_id = ?').get(r.id) as any;
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      authorId: r.author_id,
      authorName: r.author_name,
      category: r.category,
      playCount: r.play_count,
      highScore: topScoreRow?.maxScore || 0,
      isPublished: Boolean(r.is_published),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      projectData: r.project_data_json ? JSON.parse(r.project_data_json) : undefined,
    };
  });

  res.json({ games });
});

// 2. Get Game Manifest for Player Runner (JSON Bundle)
router.get('/:id/manifest', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;

  if (!row) {
    return res.status(404).json({ error: 'Game tidak ditemukan' });
  }

  try {
    const manifest: GameManifest & { projectData?: any } = {
      id: row.id,
      title: row.title,
      description: row.description,
      authorId: row.author_id,
      authorName: row.author_name,
      version: '1.0.0',
      category: row.category,
      canvas: JSON.parse(row.canvas_json),
      entities: JSON.parse(row.entities_json),
      logic: JSON.parse(row.logic_json),
      blocklyXml: row.blockly_xml || '',
      projectData: row.project_data_json ? JSON.parse(row.project_data_json) : undefined,
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json(manifest);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses manifest game', details: String(err) });
  }
});

// 2b. Direct Project Data endpoint
router.get('/:id/project', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Game tidak ditemukan' });
  try {
    const projectData = row.project_data_json ? JSON.parse(row.project_data_json) : null;
    res.json({
      id: row.id,
      title: row.title,
      projectData,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses project data' });
  }
});

// 3. Publish New Game (Accepts either classic { canvas, entities, logic } or Blockly { projectData })
router.post('/', authenticateToken, requireRole(UserRole.DEVELOPER, UserRole.ADMIN), requireActiveAccount, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { title, description, category, canvas, entities, logic, blocklyXml, projectData, status } = req.body;

  const resolvedTitle = title || projectData?.title;
  if (!resolvedTitle) {
    return res.status(400).json({ error: 'Judul game (title) wajib diisi' });
  }

  const resolvedDesc = description || (projectData ? `BlockVerse Project: ${resolvedTitle}` : '');
  const resolvedCategory = category || 'arcade';
  const resolvedCanvas = canvas || {
    width: 480,
    height: 360,
    gridSize: 20,
    backgroundColor: projectData?.stageBackdrop || '#090d16',
    tickRateMs: 16
  };
  const resolvedEntities = entities || projectData?.sprites || [];
  const resolvedLogic = logic || {
    version: '2.0',
    type: 'BLOCKVERSE_PROJECT',
    variables: projectData?.variables || {},
    sprites: projectData?.sprites || []
  };
  const projectDataJson = projectData ? JSON.stringify(projectData) : null;
  const isPublished = status === 'DRAFT' ? 0 : 1;

  const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO games (
      id, title, description, author_id, author_name, category,
      canvas_json, entities_json, logic_json, blockly_xml, project_data_json,
      is_published, play_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  insert.run(
    id,
    resolvedTitle,
    resolvedDesc,
    user.id,
    user.username,
    resolvedCategory,
    JSON.stringify(resolvedCanvas),
    JSON.stringify(resolvedEntities),
    JSON.stringify(resolvedLogic),
    blocklyXml || '',
    projectDataJson,
    isPublished,
    now,
    now
  );

  res.status(201).json({ message: 'Game berhasil dipublish ke Cloud Service!', gameId: id });
});

// 4. Update Game (Only Author or ADMIN that are ACTIVE)
router.put('/:id', authenticateToken, requireRole(UserRole.DEVELOPER, UserRole.ADMIN), requireActiveAccount, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const game = db.prepare('SELECT author_id FROM games WHERE id = ?').get(req.params.id) as any;

  if (!game) {
    return res.status(404).json({ error: 'Game tidak ditemukan' });
  }

  if (user.role !== UserRole.ADMIN && game.author_id !== user.id) {
    return res.status(403).json({ error: 'Anda hanya boleh mengedit game buatan Anda sendiri' });
  }

  const { title, description, canvas, entities, logic, blocklyXml, projectData, isPublished } = req.body;
  const now = new Date().toISOString();

  const update = db.prepare(`
    UPDATE games SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      canvas_json = COALESCE(?, canvas_json),
      entities_json = COALESCE(?, entities_json),
      logic_json = COALESCE(?, logic_json),
      blockly_xml = COALESCE(?, blockly_xml),
      project_data_json = COALESCE(?, project_data_json),
      is_published = COALESCE(?, is_published),
      updated_at = ?
    WHERE id = ?
  `);

  update.run(
    title,
    description,
    canvas ? JSON.stringify(canvas) : null,
    entities ? JSON.stringify(entities) : null,
    logic ? JSON.stringify(logic) : null,
    blocklyXml,
    projectData ? JSON.stringify(projectData) : null,
    isPublished !== undefined ? (isPublished ? 1 : 0) : null,
    now,
    req.params.id
  );

  res.json({ message: 'Game berhasil diperbarui' });
});

// 5. Delete Game (Author or ADMIN)
router.delete('/:id', authenticateToken, requireRole(UserRole.DEVELOPER, UserRole.ADMIN), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const game = db.prepare('SELECT author_id FROM games WHERE id = ?').get(req.params.id) as any;

  if (!game) {
    return res.status(404).json({ error: 'Game tidak ditemukan' });
  }

  if (user.role !== UserRole.ADMIN && game.author_id !== user.id) {
    return res.status(403).json({ error: 'Hanya pembuat atau Admin yang boleh menghapus game ini' });
  }

  db.prepare('DELETE FROM scores WHERE game_id = ?').run(req.params.id);
  db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);

  res.json({ message: 'Game dan skor terkait berhasil dihapus dari cloud' });
});

// 6. Record Play Count
router.post('/:id/play', (req: Request, res: Response) => {
  db.prepare('UPDATE games SET play_count = play_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 7. Submit High Score (Accepts both /:id/score and /:id/scores)
router.post(['/:id/score', '/:id/scores'], (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let userId = 'user_guest';
  let username = (req.body.username as string) || 'GuestPlayer';

  if (token) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      username = decoded.username;
    } catch {}
  }

  // Verify that userId exists in users table, else fallback to user_guest
  const userRow = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!userRow) {
    userId = 'user_guest';
  }

  const { score } = req.body;
  const gameId = req.params.id;

  // Verify that game exists, else fallback to '1'
  const gameRow = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
  const targetGameId = gameRow ? gameId : '1';

  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Nilai skor tidak valid' });
  }

  const scoreId = `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO scores (id, game_id, user_id, username, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(scoreId, targetGameId, userId, username, Math.floor(score), now);

  res.json({ message: 'Skor berhasil disimpan di Cloud Leaderboard!' });
});

// 8. Get Leaderboard for a Game (Accepts both /:id/leaderboard and /:id/scores)
router.get(['/:id/leaderboard', '/:id/scores'], (req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT id, game_id, user_id, username, score, created_at as createdAt
    FROM scores
    WHERE game_id = ?
    ORDER BY score DESC
    LIMIT 10
  `).all(req.params.id);

  res.json({ leaderboard: rows, scores: rows });
});

export default router;
