import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function svgToPngFile(svgString: string, outputPath: string, width: number, height: number): Promise<void> {
  try {
    // Ensure the directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Write SVG to a temporary file
    const tempSvgPath = path.join(path.dirname(outputPath), 'temp.svg');
    await fs.writeFile(tempSvgPath, svgString);

    // Use svgexport to convert SVG to PNG
    await new Promise<void>((resolve, reject) => {
        exec(`npx svgexport ${tempSvgPath} ${outputPath} ${width}:${height}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            reject(error);
          } else {
            console.log(`stdout: ${stdout}`);
            resolve();
          }
        });
      });

    // Remove temporary SVG file
    await fs.unlink(tempSvgPath);

    console.log(`PNG file saved successfully at: ${outputPath}`);
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    throw error;
  }
}