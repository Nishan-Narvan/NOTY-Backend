const express = require('express');
const { authenticateToken } = require('../middlewares/authmiddleware');
const { PrismaClient } = require('../generated/prisma');
const router = express.Router();
const prisma = new PrismaClient();


router.use(authenticateToken);

router.get('/' , async (req,res) => {
try{
    const notes = await prisma.note.findMany ({
        where: { userId: req.user.id},
        orderBy: {updatedAt: 'desc'}
    });
    res.json(notes);

} catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes'});
}
});


// post method create new notes

router.post('/', async (req, res) => {
    try{
        const {title, content } = req.body;


        if(!title || !content ){
            return res.status(400).json({ error: 'Title and content required'});
        } 

        const note = await prisma.note.create({
            data: {
                title,
                content,
                userId: req.user.id
            }
        });

        res.status(201).json(note);

    }catch(error){
        res.status(500).json({ error: 'Failed to create note'});
    }
});



// PUT /api/notes/:id - Update note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { 
        id: id,
        userId: req.user.id 
      }
    });
    
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const updatedNote = await prisma.note.update({
      where: { id: id },
      data: { title, content }
    });
    
    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Delete note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { 
        id: id,
        userId: req.user.id 
      }
    });
    
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    await prisma.note.delete({
      where: { id: id }
    });
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;