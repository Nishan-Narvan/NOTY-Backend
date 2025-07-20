/**
 * Notes Management Routes
 * This file handles all note-related operations including CRUD operations and 3-state management
 */

// Import required dependencies
const express = require('express');
const { authenticateToken } = require('../middlewares/authmiddleware');
const { PrismaClient } = require('@prisma/client');

// Initialize Express router and Prisma client
const router = express.Router();
const prisma = new PrismaClient();

/**
 * AUTHENTICATION MIDDLEWARE
 * Apply authentication to all note routes to ensure only logged-in users can access notes
 */
router.use(authenticateToken);

/**
 * GET ACTIVE NOTES ENDPOINT
 * GET /api/notes
 * Retrieves all active notes for the authenticated user with search and pagination
 */
router.get('/', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT QUERY PARAMETERS
     * Get pagination and search parameters from request
     */
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit); // Calculate offset for pagination
    const take = parseInt(limit); // Number of items to fetch

    /**
     * STEP 2: BUILD SEARCH CONDITIONS
     * Create database query conditions based on user and search parameters
     */
    const searchConditions = {
      userId: req.user.id, // Only fetch notes belonging to authenticated user
      status: 'ACTIVE'     // Only fetch active notes
    };

    // Add search functionality if search term is provided
    if (search) {
      searchConditions.OR = [
        { title: { contains: search, mode: 'insensitive' } },   // Search in title
        { content: { contains: search, mode: 'insensitive' } }  // Search in content
      ];
    }

    /**
     * STEP 3: EXECUTE DATABASE QUERIES
     * Fetch notes and total count simultaneously for efficiency
     */
    const [notes, totalCount] = await Promise.all([
      // Fetch paginated notes
      prisma.note.findMany({
        where: searchConditions,
        orderBy: { updatedAt: 'desc' }, // Most recently updated first
        skip,
        take
      }),
      // Get total count for pagination
      prisma.note.count({ where: searchConditions })
    ]);

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Send notes data with pagination information
     */
    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get active notes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notes'
    });
  }
});

/**
 * GET ARCHIVED NOTES ENDPOINT
 * GET /api/notes/archived
 * Retrieves all archived notes for the authenticated user
 */
router.get('/archived', async (req, res) => {
  try {
    /**
     * STEP 1: FETCH ARCHIVED NOTES
     * Query database for notes with ARCHIVED status belonging to the user
     */
    const notes = await prisma.note.findMany({
      where: { 
        userId: req.user.id,    // Only user's notes
        status: 'ARCHIVED'      // Only archived notes
      },
      orderBy: { updatedAt: 'desc' } // Most recently updated first
    });

    /**
     * STEP 2: RETURN SUCCESS RESPONSE
     * Send archived notes data
     */
    res.json({
      success: true,
      data: { notes }
    });

  } catch (error) {
    console.error('Get archived notes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch archived notes'
    });
  }
});

/**
 * GET TRASHED NOTES ENDPOINT
 * GET /api/notes/trash
 * Retrieves all trashed notes for the authenticated user
 */
router.get('/trash', async (req, res) => {
  try {
    /**
     * STEP 1: FETCH TRASHED NOTES
     * Query database for notes with TRASH status belonging to the user
     */
    const notes = await prisma.note.findMany({
      where: { 
        userId: req.user.id,    // Only user's notes
        status: 'TRASH'         // Only trashed notes
      },
      orderBy: { updatedAt: 'desc' } // Most recently updated first
    });

    /**
     * STEP 2: RETURN SUCCESS RESPONSE
     * Send trashed notes data
     */
    res.json({
      success: true,
      data: { notes }
    });

  } catch (error) {
    console.error('Get trashed notes error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch trashed notes'
    });
  }
});

/**
 * GET NOTES STATISTICS ENDPOINT
 * GET /api/notes/stats
 * Returns count of notes by status (active, archived, trash) for the authenticated user
 */
router.get('/stats', async (req, res) => {
  try {
    /**
     * STEP 1: FETCH NOTE STATISTICS
     * Group notes by status and count them for the current user
     */
    const stats = await prisma.note.groupBy({
      by: ['status'],           // Group by note status
      where: { userId: req.user.id }, // Only user's notes
      _count: {
        status: true            // Count notes in each status
      }
    });

    /**
     * STEP 2: FORMAT STATISTICS
     * Convert database results to a more user-friendly format
     */
    const statsObj = {
      active: 0,    // Initialize counters
      archived: 0,
      trash: 0
    };

    // Map database results to formatted object
    stats.forEach(stat => {
      statsObj[stat.status.toLowerCase()] = stat._count.status;
    });

    /**
     * STEP 3: RETURN SUCCESS RESPONSE
     * Send formatted statistics data
     */
    res.json({
      success: true,
      data: { stats: statsObj }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET SINGLE NOTE ENDPOINT
 * GET /api/notes/:id
 * Retrieves a specific note by ID for the authenticated user
 */
router.get('/:id', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT NOTE ID
     * Get the note ID from request parameters
     */
    const { id } = req.params;

    /**
     * STEP 2: FETCH NOTE FROM DATABASE
     * Find the specific note belonging to the authenticated user
     */
    const note = await prisma.note.findFirst({
      where: { 
        id: id,              // Note ID from URL
        userId: req.user.id  // Ensure note belongs to user
      }
    });

    /**
     * STEP 3: VALIDATE NOTE EXISTS
     * Check if the note was found in the database
     */
    if (!note) {
      return res.status(404).json({ 
        success: false,
        error: 'Note not found' 
      });
    }

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Send the note data
     */
    res.json({
      success: true,
      data: { note }
    });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch note'
    });
  }
});

/**
 * CREATE NEW NOTE ENDPOINT
 * POST /api/notes
 * Creates a new note for the authenticated user (defaults to ACTIVE status)
 */
router.post('/', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT AND VALIDATE INPUT
     * Get note data from request body and validate required fields
     */
    const { title, content } = req.body;

    // Check if required fields are provided
    if (!title || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and content are required'
      });
    }

    // Check if fields are not empty after trimming whitespace
    if (title.trim().length === 0 || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and content cannot be empty'
      });
    }

    /**
     * STEP 2: CREATE NOTE IN DATABASE
     * Store the new note with user association and default ACTIVE status
     */
    const note = await prisma.note.create({
      data: {
        title: title.trim(),      // Remove leading/trailing whitespace
        content: content.trim(),  // Remove leading/trailing whitespace
        userId: req.user.id,      // Associate with authenticated user
        status: 'ACTIVE'          // Default status for new notes
      }
    });

    /**
     * STEP 3: RETURN SUCCESS RESPONSE
     * Send confirmation with created note data
     */
    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note }
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create note'
    });
  }
});

/**
 * UPDATE NOTE ENDPOINT
 * PUT /api/notes/:id
 * Updates the title and content of a specific note for the authenticated user
 */
router.put('/:id', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT AND VALIDATE INPUT
     * Get note ID from URL and data from request body
     */
    const { id } = req.params;
    const { title, content } = req.body;

    // Validate that required fields are provided
    if (!title || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and content are required'
      });
    }

    /**
     * STEP 2: VERIFY NOTE EXISTS AND BELONGS TO USER
     * Check if the note exists and is owned by the authenticated user
     */
    const existingNote = await prisma.note.findFirst({
      where: {
        id: id,              // Note ID from URL
        userId: req.user.id  // Ensure note belongs to user
      }
    });

    // Check if note was found
    if (!existingNote) {
      return res.status(404).json({ 
        success: false,
        error: 'Note not found' 
      });
    }

    /**
     * STEP 3: UPDATE NOTE IN DATABASE
     * Update the note with new title and content
     */
    const updatedNote = await prisma.note.update({
      where: { id: id },
      data: { 
        title: title.trim(),    // Remove leading/trailing whitespace
        content: content.trim() // Remove leading/trailing whitespace
      }
    });

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Send confirmation with updated note data
     */
    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note: updatedNote }
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update note'
    });
  }
});

/**
 * ARCHIVE NOTE ENDPOINT
 * PUT /api/notes/:id/archive
 * Moves a note from ACTIVE to ARCHIVED status
 */
router.put('/:id/archive', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT NOTE ID
     * Get the note ID from request parameters
     */
    const { id } = req.params;

    /**
     * STEP 2: UPDATE NOTE STATUS TO ARCHIVED
     * Only allow archiving of active notes belonging to the user
     */
    const result = await prisma.note.updateMany({
      where: { 
        id,                    // Note ID from URL
        userId: req.user.id,   // Ensure note belongs to user
        status: 'ACTIVE'       // Only archive active notes
      },
      data: { status: 'ARCHIVED' }
    });

    /**
     * STEP 3: VALIDATE UPDATE SUCCESS
     * Check if any notes were actually updated
     */
    if (result.count === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Active note not found'
      });
    }

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Confirm the note was archived successfully
     */
    res.json({
      success: true,
      message: 'Note archived successfully'
    });

  } catch (error) {
    console.error('Archive note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to archive note'
    });
  }
});

/**
 * UNARCHIVE NOTE ENDPOINT
 * PUT /api/notes/:id/unarchive
 * Moves a note from ARCHIVED back to ACTIVE status
 */
router.put('/:id/unarchive', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT NOTE ID
     * Get the note ID from request parameters
     */
    const { id } = req.params;

    /**
     * STEP 2: UPDATE NOTE STATUS TO ACTIVE
     * Only allow unarchiving of archived notes belonging to the user
     */
    const result = await prisma.note.updateMany({
      where: { 
        id,                    // Note ID from URL
        userId: req.user.id,   // Ensure note belongs to user
        status: 'ARCHIVED'     // Only unarchive archived notes
      },
      data: { status: 'ACTIVE' }
    });

    /**
     * STEP 3: VALIDATE UPDATE SUCCESS
     * Check if any notes were actually updated
     */
    if (result.count === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Archived note not found'
      });
    }

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Confirm the note was unarchived successfully
     */
    res.json({
      success: true,
      message: 'Note unarchived successfully'
    });

  } catch (error) {
    console.error('Unarchive note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to unarchive note'
    });
  }
});

/**
 * MOVE NOTE TO TRASH ENDPOINT
 * PUT /api/notes/:id/trash
 * Moves a note from ACTIVE or ARCHIVED to TRASH status
 */
router.put('/:id/trash', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT NOTE ID
     * Get the note ID from request parameters
     */
    const { id } = req.params;

    /**
     * STEP 2: UPDATE NOTE STATUS TO TRASH
     * Allow moving notes from both ACTIVE and ARCHIVED states to trash
     */
    const result = await prisma.note.updateMany({
      where: { 
        id,                                    // Note ID from URL
        userId: req.user.id,                   // Ensure note belongs to user
        status: { in: ['ACTIVE', 'ARCHIVED'] } // Can trash from both states
      },
      data: { status: 'TRASH' }
    });

    /**
     * STEP 3: VALIDATE UPDATE SUCCESS
     * Check if any notes were actually updated
     */
    if (result.count === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Note not found or already in trash'
      });
    }

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Confirm the note was moved to trash successfully
     */
    res.json({
      success: true,
      message: 'Note moved to trash successfully'
    });

  } catch (error) {
    console.error('Trash note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to move note to trash'
    });
  }
});

/**
 * RESTORE NOTE FROM TRASH ENDPOINT
 * PUT /api/notes/:id/restore
 * Moves a note from TRASH back to ACTIVE status
 */
router.put('/:id/restore', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT NOTE ID
     * Get the note ID from request parameters
     */
    const { id } = req.params;

    /**
     * STEP 2: UPDATE NOTE STATUS TO ACTIVE
     * Only allow restoring of trashed notes belonging to the user
     */
    const result = await prisma.note.updateMany({
      where: { 
        id,                // Note ID from URL
        userId: req.user.id, // Ensure note belongs to user
        status: 'TRASH'    // Only restore trashed notes
      },
      data: { status: 'ACTIVE' }
    });

    /**
     * STEP 3: VALIDATE UPDATE SUCCESS
     * Check if any notes were actually updated
     */
    if (result.count === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Trashed note not found'
      });
    }

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Confirm the note was restored successfully
     */
    res.json({
      success: true,
      message: 'Note restored successfully'
    });

  } catch (error) {
    console.error('Restore note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to restore note'
    });
  }
});

/**
 * PERMANENTLY DELETE NOTE ENDPOINT
 * DELETE /api/notes/:id
 * Permanently removes a note from the database (irreversible)
 */
router.delete('/:id', async (req, res) => {
  try {
    /**
     * STEP 1: EXTRACT NOTE ID
     * Get the note ID from request parameters
     */
    const { id } = req.params;

    /**
     * STEP 2: VERIFY NOTE EXISTS AND BELONGS TO USER
     * Check if the note exists and is owned by the authenticated user
     */
    const existingNote = await prisma.note.findFirst({
      where: {
        id: id,              // Note ID from URL
        userId: req.user.id  // Ensure note belongs to user
      }
    });

    // Check if note was found
    if (!existingNote) {
      return res.status(404).json({ 
        success: false,
        error: 'Note not found' 
      });
    }

    /**
     * STEP 3: PERMANENTLY DELETE NOTE
     * Remove the note from the database (this action is irreversible)
     */
    await prisma.note.delete({
      where: { id: id }
    });

    /**
     * STEP 4: RETURN SUCCESS RESPONSE
     * Confirm the note was permanently deleted
     */
    res.json({ 
      success: true,
      message: 'Note permanently deleted'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete note'
    });
  }
});

module.exports = router;