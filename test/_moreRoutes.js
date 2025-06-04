const router = require('express4').Router()
const openapi = require('..')

const oapi = openapi()
router.use(oapi)

router.get(
  '/:id',
  oapi.validPath({
    summary: 'Get a user.',
    parameters: [
      {
        in: 'path',
        name: 'id',
        schema: {
          type: 'integer'
        }
      }
    ],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              type: 'string'
            }
          }
        }
      }
    }
  }),
  async (req, res) => {
    res.send('done')
  }
)

module.exports = router
