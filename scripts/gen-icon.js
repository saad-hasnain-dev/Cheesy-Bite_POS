const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

const svgPath = path.join(__dirname, '..', 'resources', 'logo.svg')
const icoPath = path.join(__dirname, '..', 'resources', 'icon.ico')

const svgContent = fs.readFileSync(svgPath, 'utf-8')

const SIZES = [256, 64, 48, 32, 16]

function renderToPng(size) {
  const resvg = new Resvg(svgContent, {
    background: '#000000',
    fitTo: { mode: 'width', value: size },
    imageRendering: 0,
    shapeRendering: 2,
    textRendering: 1,
  })
  return resvg.render().asPng()
}

function buildIco(pngs) {
  const count = pngs.length
  const headerSize = 6
  const dirEntrySize = 16
  let offset = headerSize + dirEntrySize * count

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  const dirs = pngs.map((png, i) => {
    const size = SIZES[i]
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(size === 256 ? 0 : size, 0)
    entry.writeUInt8(size === 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  return Buffer.concat([header, ...dirs, ...pngs])
}

console.log('Generating icon from SVG logo...')
const pngs = SIZES.map(size => {
  process.stdout.write(`  Rendering ${size}x${size}... `)
  const png = renderToPng(size)
  console.log(`${png.length} bytes`)
  return png
})

const ico = buildIco(pngs)
fs.writeFileSync(icoPath, ico)
console.log(`\nDone: ${icoPath} (${ico.length} bytes)`)
