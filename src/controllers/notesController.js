// Notes Controller: encapsulates all note-related business logic
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to format pagination
function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

// GET /api/notes (active notes with search & pagination)
async function listActiveNotes(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const search = req.query.search;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id, status: 'ACTIVE' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      prisma.note.count({ where })
    ]);

    res.json({ success: true, data: { notes, pagination: buildPagination(page, limit, total) } });
  } catch (err) { next(err); }
}

// GET /api/notes/archived
async function listArchivedNotes(req, res, next) {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user.id, status: 'ARCHIVED' },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: { notes } });
  } catch (err) { next(err); }
}

// GET /api/notes/trash
async function listTrashedNotes(req, res, next) {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user.id, status: 'TRASH' },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: { notes } });
  } catch (err) { next(err); }
}

// GET /api/notes/stats
async function notesStats(req, res, next) {
  try {
    const stats = await prisma.note.groupBy({
      by: ['status'],
      where: { userId: req.user.id },
      _count: { status: true }
    });
    const out = { active: 0, archived: 0, trash: 0 };
    stats.forEach(s => { out[s.status.toLowerCase()] = s._count.status; });
    res.json({ success: true, data: { stats: out } });
  } catch (err) { next(err); }
}

// GET /api/notes/:id
async function getNote(req, res, next) {
  try {
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
    res.json({ success: true, data: { note } });
  } catch (err) { next(err); }
}

// POST /api/notes
async function createNote(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!title || !content || !title.trim() || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }
    const note = await prisma.note.create({
      data: { title: title.trim(), content: content.trim(), userId: req.user.id, status: 'ACTIVE' }
    });
    res.status(201).json({ success: true, message: 'Note created successfully', data: { note } });
  } catch (err) { next(err); }
}

// PUT /api/notes/:id
async function updateNote(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, error: 'Title and content are required' });
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Note not found' });
    const updated = await prisma.note.update({ where: { id: req.params.id }, data: { title: title.trim(), content: content.trim() } });
    res.json({ success: true, message: 'Note updated successfully', data: { note: updated } });
  } catch (err) { next(err); }
}

// PUT helpers for status transitions
async function transitionStatus(req, res, next, fromStatuses, toStatus, notFoundMsg) {
  try {
    const result = await prisma.note.updateMany({
      where: { id: req.params.id, userId: req.user.id, status: { in: fromStatuses } },
      data: { status: toStatus }
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: notFoundMsg });
    res.json({ success: true, message: `Note ${toStatus.toLowerCase()} successfully` });
  } catch (err) { next(err); }
}

function archiveNote(req, res, next) { return transitionStatus(req, res, next, ['ACTIVE'], 'ARCHIVED', 'Active note not found'); }
function unarchiveNote(req, res, next) { return transitionStatus(req, res, next, ['ARCHIVED'], 'ACTIVE', 'Archived note not found'); }
function trashNote(req, res, next) { return transitionStatus(req, res, next, ['ACTIVE', 'ARCHIVED'], 'TRASH', 'Note not found or already trashed'); }
function restoreNote(req, res, next) { return transitionStatus(req, res, next, ['TRASH'], 'ACTIVE', 'Trashed note not found'); }

// DELETE /api/notes/:id
async function deleteNote(req, res, next) {
  try {
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Note not found' });
    await prisma.note.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Note permanently deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  listActiveNotes,
  listArchivedNotes,
  listTrashedNotes,
  notesStats,
  getNote,
  createNote,
  updateNote,
  archiveNote,
  unarchiveNote,
  trashNote,
  restoreNote,
  deleteNote
};
