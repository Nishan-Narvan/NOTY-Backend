/**
 * Notes Management Routes (Refactored)
 * Uses controller functions to reduce duplication and centralize logic.
 */
const express = require('express');
const { authenticateToken } = require('../middlewares/authmiddleware');
const {
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
} = require('../controllers/notesController');

const router = express.Router();
router.use(authenticateToken);

// Route bindings
router.get('/', listActiveNotes);
router.get('/archived', listArchivedNotes);
router.get('/trash', listTrashedNotes);
router.get('/stats', notesStats);
router.get('/:id', getNote);
router.post('/', createNote);
router.put('/:id', updateNote);
router.put('/:id/archive', archiveNote);
router.put('/:id/unarchive', unarchiveNote);
router.put('/:id/trash', trashNote);
router.put('/:id/restore', restoreNote);
router.delete('/:id', deleteNote);

/**
 * GET ARCHIVED NOTES ENDPOINT
 * GET /api/notes/archived
 * Retrieves all archived notes for the authenticated user
 */
// (Controller used above) /archived

/**
 * GET TRASHED NOTES ENDPOINT
 * GET /api/notes/trash
 * Retrieves all trashed notes for the authenticated user
 */
// (Controller used above) /trash

/**
 * GET NOTES STATISTICS ENDPOINT
 * GET /api/notes/stats
 * Returns count of notes by status (active, archived, trash) for the authenticated user
 */
// (Controller used above) /stats

/**
 * GET SINGLE NOTE ENDPOINT
 * GET /api/notes/:id
 * Retrieves a specific note by ID for the authenticated user
 */
// (Controller used above) /:id

/**
 * CREATE NEW NOTE ENDPOINT
 * POST /api/notes
 * Creates a new note for the authenticated user (defaults to ACTIVE status)
 */
// (Controller used above) POST /

/**
 * UPDATE NOTE ENDPOINT
 * PUT /api/notes/:id
 * Updates the title and content of a specific note for the authenticated user
 */
// (Controller used above) PUT /:id

/**
 * ARCHIVE NOTE ENDPOINT
 * PUT /api/notes/:id/archive
 * Moves a note from ACTIVE to ARCHIVED status
 */
// (Controller used above) PUT /:id/archive

/**
 * UNARCHIVE NOTE ENDPOINT
 * PUT /api/notes/:id/unarchive
 * Moves a note from ARCHIVED back to ACTIVE status
 */
// (Controller used above) PUT /:id/unarchive

/**
 * MOVE NOTE TO TRASH ENDPOINT
 * PUT /api/notes/:id/trash
 * Moves a note from ACTIVE or ARCHIVED to TRASH status
 */
// (Controller used above) PUT /:id/trash

/**
 * RESTORE NOTE FROM TRASH ENDPOINT
 * PUT /api/notes/:id/restore
 * Moves a note from TRASH back to ACTIVE status
 */
// (Controller used above) PUT /:id/restore

/**
 * PERMANENTLY DELETE NOTE ENDPOINT
 * DELETE /api/notes/:id
 * Permanently removes a note from the database (irreversible)
 */
// (Controller used above) DELETE /:id

module.exports = router;