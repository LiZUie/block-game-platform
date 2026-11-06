import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole, GameManifest, GameSummary } from '@blockgame/shared';

const router = Router();

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
  const games: GameSummary[] = rows.map(r => {
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
      updatedAt: r.updated_at
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
    const manifest: GameManifest = {
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
      isPublished: Boolean(row.is_published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json(manifest);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses manifest game', details: String(err) });
  }
});

// 3. Publish New Game (Only DEVELOPER & ADMIN)
router.post('/', authenticateToken, requireRole(UserRole.DEVELOPER, UserRole.ADMIN), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, canvas, entities, logic, blocklyXml } = req.body;
  const user = req.user!;

  if (!title || !canvas || !entities || !logic) {
    return res.status(400).json({ error: 'Data game tidak lengkap (title, canvas, entities, logic wajib)' });
  }

  const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO games (
      id, title, description, author_id, author_name, category,
      canvas_json, entities_json, logic_json, blockly_xml,
      is_published, play_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  insert.run(
    id,
    title,
    description || '',
    user.id,
    user.username,
    category || 'classic',
    JSON.stringify(canvas),
    JSON.stringify(entities),
    JSON.stringify(logic),
    blocklyXml || '',
    1, // default published
    now,
    now
  );

  res.status(201).json({ message: 'Game berhasil dipublish ke Cloud Service!', gameId: id });
});

// 4. Update Game (Only Author or ADMIN)
router.put('/:id', authenticateToken, requireRole(UserRole.DEVELOPER, UserRole.ADMIN), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const game = db.prepare('SELECT author_id FROM games WHERE id = ?').get(req.params.id) as any;

  if (!game) {
    return res.status(404).json({ error: 'Game tidak ditemukan' });
  }

  if (user.role !== UserRole.ADMIN && game.author_id !== user.id) {
    return res.status(403).json({ error: 'Anda hanya boleh mengedit game buatan Anda sendiri' });
  }

  const { title, description, canvas, entities, logic, blocklyXml, isPublished } = req.body;
  const now = new Date().toISOString();

  const update = db.prepare(`
    UPDATE games SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      canvas_json = COALESCE(?, canvas_json),
      entities_json = COALESCE(?, entities_json),
      logic_json = COALESCE(?, logic_json),
      blockly_xml = COALESCE(?, blockly_xml),
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

// 7. Submit High Score (Any authenticated user)
router.post('/:id/score', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { score } = req.body;
  const user = req.user!;
  const gameId = req.params.id;

  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Nilai skor tidak valid' });
  }

  const scoreId = `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO scores (id, game_id, user_id, username, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(scoreId, gameId, user.id, user.username, Math.floor(score), now);

  res.json({ message: 'Skor berhasil disimpan di Cloud Leaderboard!' });
});

// 8. Get Leaderboard for a Game
router.get('/:id/leaderboard', (req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT id, game_id, user_id, username, score, created_at
    FROM scores
    WHERE game_id = ?
    ORDER BY score DESC
    LIMIT 10
  `).all(req.params.id);

  res.json({ leaderboard: rows });
});

export default router;
