import puppeteer, { LaunchOptions } from 'puppeteer-core'
import chromeLambda from 'chrome-aws-lambda'
import { VercelRequest, VercelResponse } from '@vercel/node'
import path from 'path'
import { promises as fs } from 'fs'

const getLaunchOptions = async (): Promise<LaunchOptions> => process.env.IS_PRODUCUTION
  ? {
    executablePath: await chromeLambda.executablePath,
    headless: chromeLambda.headless,
    args: chromeLambda.args
  } : {
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  }

const getScreenshot = async (title: string, date: Date, platform = 'InkoHX Blog'): Promise<Buffer> => {
  const dateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  const browser = await puppeteer.launch(await getLaunchOptions())
  const page = await browser.newPage()

  await page.setViewport({ width: 1280, height: 680 })
  await page.setContent((await fs.readFile(path.join(__dirname, '_static/template.html'), 'utf-8'))
    .replace('(TITLE_TEXT)', title)
    .replace('(DATE)', dateTime.format(date))
    .replace('(PLATFORM)', platform))

  return page.screenshot({ type: 'png' })
}

// eslint-disable-next-line
export default async function (request: VercelRequest, response: VercelResponse) {
  try {
    const { title, date, platform } = request.query

    if (typeof title !== 'string') return response.status(400).send({ message: 'Title is required' })
    if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) return response.status(400).send({ message: 'The data format is incorrect.' })
    if (Array.isArray(platform)) return response.status(400).send({ message: 'The platform is incorrect.' })

    const screenshot = await getScreenshot(title, new Date(date), platform)

    response.setHeader('Content-Type', 'image/png')
    response.setHeader('Cache-Control', 'max-age=31536000')

    return response
      .status(200)
      .end(screenshot)
  } catch (error) {
    if (error instanceof Error) return response.status(500).send({ message: error.message })
    else return response.status(500).send({ message: 'Internal Server Error' })
  }
}
