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

module.exports = router;