const router = require('express').Router({ mergeParams: true })
const openapi = require('..')

const oapi = openapi()
router.use(oapi)

router.get(
  '/',
  oapi.validPath({
    summary: 'Get a user.',
    parameters: [
      {
        in: 'path',
        imageId: 'id',
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
