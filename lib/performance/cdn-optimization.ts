import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import * as path from 'path'

/**
 * CDN and Static Asset Optimization Service
 */
export class CDNOptimizer {
  private static readonly CDN_BASE_URL = process.env.CDN_BASE_URL || ''
  private static readonly ASSET_VERSION = process.env.ASSET_VERSION || '1.0.0'
  
  // Asset type configurations
  private static readonly ASSET_CONFIGS = {
    images: {
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'],
      maxAge: 31536000, // 1 year
      immutable: true,
      compress: true,
      formats: ['webp', 'avif'] // Modern formats to prefer
    },
    scripts: {
      extensions: ['.js', '.mjs'],
      maxAge: 31536000, // 1 year  
      immutable: true,
      compress: true,
      minify: true
    },
    styles: {
      extensions: ['.css'],
      maxAge: 31536000, // 1 year
      immutable: true,
      compress: true,
      minify: true
    },
    fonts: {
      extensions: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
      maxAge: 31536000, // 1 year
      immutable: true,
      compress: false, // Fonts are already compressed
      preload: true
    },
    documents: {
      extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
      maxAge: 86400, // 1 day
      immutable: false,
      compress: true
    },
    media: {
      extensions: ['.mp4', '.mp3', '.wav', '.ogg'],
      maxAge: 604800, // 1 week
      immutable: false,
      compress: false
    }
  }

  /**
   * Get asset configuration based on file extension
   */
  private static getAssetConfig(filePath: string): any {
    const ext = path.extname(filePath).toLowerCase()
    
    for (const [type, config] of Object.entries(this.ASSET_CONFIGS)) {
      if (config.extensions.includes(ext)) {
        return { type, ...config }
      }
    }
    
    return {
      type: 'other',
      extensions: [],
      maxAge: 3600, // 1 hour default
      immutable: false,
      compress: false
    }
  }

  /**
   * Generate CDN URL for asset
   */
  static getCDNUrl(assetPath: string, options: {
    version?: string
    resize?: { width?: number; height?: number; quality?: number }
    format?: string
  } = {}): string {
    if (!this.CDN_BASE_URL) {
      return assetPath // Fallback to original path
    }

    const { version = this.ASSET_VERSION, resize, format } = options
    let cdnPath = `${this.CDN_BASE_URL}/${version}${assetPath}`
    
    // Add image transformations for supported formats
    const ext = path.extname(assetPath).toLowerCase()
    const isImage = this.ASSET_CONFIGS.images.extensions.includes(ext)
    
    if (isImage && (resize || format)) {
      const params = new URLSearchParams()
      
      if (resize?.width) params.set('w', resize.width.toString())
      if (resize?.height) params.set('h', resize.height.toString())
      if (resize?.quality) params.set('q', resize.quality.toString())
      if (format) params.set('f', format)
      
      if (params.toString()) {
        cdnPath += `?${params.toString()}`
      }
    }
    
    return cdnPath
  }

  /**
   * Generate responsive image URLs
   */
  static getResponsiveImageUrls(imagePath: string, sizes: number[] = [320, 640, 1024, 1920]): {
    src: string
    srcSet: string
    sizes: string
  } {
    const srcSet = sizes
      .map(size => `${this.getCDNUrl(imagePath, { resize: { width: size, quality: 85 } })} ${size}w`)
      .join(', ')
    
    const sizesAttr = sizes
      .map((size, index) => {
        if (index === sizes.length - 1) return `${size}px`
        return `(max-width: ${size}px) ${size}px`
      })
      .join(', ')

    return {
      src: this.getCDNUrl(imagePath),
      srcSet,
      sizes: sizesAttr
    }
  }

  /**
   * Generate WebP/AVIF variants for modern browsers
   */
  static getModernImageFormats(imagePath: string): {
    avif?: string
    webp?: string
    fallback: string
  } {
    const ext = path.extname(imagePath).toLowerCase()
    
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return { fallback: this.getCDNUrl(imagePath) }
    }

    return {
      avif: this.getCDNUrl(imagePath, { format: 'avif' }),
      webp: this.getCDNUrl(imagePath, { format: 'webp' }),
      fallback: this.getCDNUrl(imagePath)
    }
  }

  /**
   * Optimize static asset response
   */
  static optimizeAssetResponse(
    request: NextRequest,
    filePath: string,
    fileContent: Buffer
  ): NextResponse {
    const config = this.getAssetConfig(filePath)
    
    // Generate strong ETag
    const etag = crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 16)
    
    // Check if client has cached version
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === `"${etag}"`) {
      return new NextResponse(null, { status: 304 })
    }

    // Set caching headers
    const headers = new Headers()
    
    // Cache control
    if (config.immutable) {
      headers.set('Cache-Control', `public, max-age=${config.maxAge}, immutable`)
    } else {
      headers.set('Cache-Control', `public, max-age=${config.maxAge}`)
    }
    
    // ETag for validation
    headers.set('ETag', `"${etag}"`)
    
    // Content type
    const mimeType = this.getMimeType(filePath)
    if (mimeType) {
      headers.set('Content-Type', mimeType)
    }
    
    // Security headers for assets
    headers.set('X-Content-Type-Options', 'nosniff')
    
    // Compression hint
    if (config.compress) {
      headers.set('Vary', 'Accept-Encoding')
    }

    // CORS for cross-origin assets
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
    
    return new NextResponse(fileContent, {
      status: 200,
      headers
    })
  }

  /**
   * Get MIME type for file
   */
  private static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.eot': 'application/vnd.ms-fontobject',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    }
    
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Generate preload links for critical assets
   */
  static generatePreloadLinks(assets: Array<{
    href: string
    type: 'script' | 'style' | 'font' | 'image'
    crossorigin?: boolean
  }>): string {
    return assets
      .map(asset => {
        const rel = asset.type === 'script' ? 'modulepreload' : 'preload'
        const as = asset.type === 'script' ? undefined : asset.type === 'style' ? 'style' : asset.type
        
        let link = `<${asset.href}>; rel=${rel}`
        if (as) link += `; as=${as}`
        if (asset.crossorigin) link += '; crossorigin'
        
        return link
      })
      .join(', ')
  }

  /**
   * Create resource hints for performance
   */
  static createResourceHints(): {
    dnsPrefetch: string[]
    preconnect: string[]
    prefetch: string[]
  } {
    const hints = {
      dnsPrefetch: [] as string[],
      preconnect: [] as string[],
      prefetch: [] as string[]
    }

    // Add CDN domains
    if (this.CDN_BASE_URL) {
      const cdnDomain = new URL(this.CDN_BASE_URL).hostname
      hints.dnsPrefetch.push(cdnDomain)
      hints.preconnect.push(this.CDN_BASE_URL)
    }

    // Add external service domains
    hints.dnsPrefetch.push(
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    )

    return hints
  }
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  /**
   * Generate picture element with modern formats
   */
  static generatePictureElement(
    imagePath: string,
    alt: string,
    sizes?: number[],
    className?: string
  ): string {
    const formats = CDNOptimizer.getModernImageFormats(imagePath)
    const responsive = sizes ? CDNOptimizer.getResponsiveImageUrls(imagePath, sizes) : null
    
    let picture = '<picture>'
    
    // AVIF source
    if (formats.avif) {
      picture += `<source type="image/avif" srcset="${formats.avif}">`
    }
    
    // WebP source  
    if (formats.webp) {
      picture += `<source type="image/webp" srcset="${formats.webp}">`
    }
    
    // Fallback img
    picture += `<img src="${formats.fallback}" alt="${alt}"`
    if (responsive) {
      picture += ` srcset="${responsive.srcSet}" sizes="${responsive.sizes}"`
    }
    if (className) {
      picture += ` class="${className}"`
    }
    picture += ' loading="lazy" decoding="async">'
    
    picture += '</picture>'
    
    return picture
  }

  /**
   * Get optimal image dimensions based on usage
   */
  static getOptimalDimensions(
    usage: 'thumbnail' | 'card' | 'hero' | 'gallery' | 'avatar'
  ): { width: number; height: number; quality: number } {
    const configs = {
      thumbnail: { width: 150, height: 150, quality: 75 },
      avatar: { width: 64, height: 64, quality: 80 },
      card: { width: 400, height: 300, quality: 80 },
      gallery: { width: 800, height: 600, quality: 85 },
      hero: { width: 1920, height: 1080, quality: 90 }
    }
    
    return configs[usage] || { width: 800, height: 600, quality: 80 }
  }
}

/**
 * Font optimization utilities  
 */
export class FontOptimizer {
  private static readonly GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2'
  
  /**
   * Generate optimized Google Fonts link
   */
  static generateGoogleFontsLink(
    families: string[],
    display: 'swap' | 'fallback' | 'optional' = 'swap'
  ): string {
    const familyParam = families
      .map(family => family.replace(' ', '+'))
      .join('&family=')
    
    return `${this.GOOGLE_FONTS_API}?family=${familyParam}&display=${display}`
  }

  /**
   * Generate font preload links
   */
  static generateFontPreloads(fontPaths: string[]): string {
    return fontPaths
      .map(path => `<link rel="preload" href="${CDNOptimizer.getCDNUrl(path)}" as="font" type="font/woff2" crossorigin>`)
      .join('\n')
  }
}

/**
 * Bundle optimization utilities
 */
export class BundleOptimizer {
  /**
   * Generate critical CSS inline styles
   */
  static inlineCriticalCSS(criticalCSS: string): string {
    return `<style data-critical>${criticalCSS}</style>`
  }

  /**
   * Generate non-critical CSS loading
   */
  static loadNonCriticalCSS(cssPath: string): string {
    const cdnUrl = CDNOptimizer.getCDNUrl(cssPath)
    return `
      <link rel="preload" href="${cdnUrl}" as="style" onload="this.onload=null;this.rel='stylesheet'">
      <noscript><link rel="stylesheet" href="${cdnUrl}"></noscript>
    `
  }

  /**
   * Generate script loading with optimal strategy
   */
  static loadScript(
    scriptPath: string,
    strategy: 'defer' | 'async' | 'module' = 'defer'
  ): string {
    const cdnUrl = CDNOptimizer.getCDNUrl(scriptPath)
    
    if (strategy === 'module') {
      return `<script type="module" src="${cdnUrl}"></script>`
    }
    
    return `<script src="${cdnUrl}" ${strategy}></script>`
  }
}

/**
 * Performance monitoring for assets
 */
export class AssetPerformanceMonitor {
  /**
   * Track asset loading performance
   */
  static trackAssetPerformance(): string {
    return `
      <script>
        // Track asset loading performance
        window.addEventListener('load', () => {
          const perfEntries = performance.getEntriesByType('resource');
          const assetPerf = perfEntries
            .filter(entry => entry.initiatorType === 'img' || entry.initiatorType === 'script' || entry.initiatorType === 'link')
            .map(entry => ({
              name: entry.name,
              type: entry.initiatorType,
              loadTime: entry.loadEnd - entry.startTime,
              size: entry.transferSize
            }));
          
          // Send to analytics
          if (window.gtag) {
            assetPerf.forEach(asset => {
              gtag('event', 'asset_performance', {
                event_category: 'Performance',
                asset_type: asset.type,
                load_time: Math.round(asset.loadTime),
                asset_size: asset.size
              });
            });
          }
        });
      </script>
    `
  }

  /**
   * Monitor Core Web Vitals
   */
  static monitorCoreWebVitals(): string {
    return `
      <script>
        // Core Web Vitals monitoring
        function sendToAnalytics(metric) {
          if (window.gtag) {
            gtag('event', metric.name, {
              value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
              event_category: 'Web Vitals',
              event_label: metric.id,
              non_interaction: true,
            });
          }
        }

        // Import web-vitals library if available
        if (window.webVitals) {
          webVitals.getCLS(sendToAnalytics);
          webVitals.getFID(sendToAnalytics);  
          webVitals.getFCP(sendToAnalytics);
          webVitals.getLCP(sendToAnalytics);
          webVitals.getTTFB(sendToAnalytics);
        }
      </script>
    `
  }
}

export {
  CDNOptimizer,
  ImageOptimizer,
  FontOptimizer,
  BundleOptimizer,
  AssetPerformanceMonitor
}