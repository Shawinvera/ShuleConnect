#!/usr/bin/env node

/**
 * Avatar Scanner Script
 * 
 * This script scans the avatar directories and generates updated avatar lists
 * for the AvatarService. Run this script whenever you add new avatars.
 * 
 * Usage: node scripts/scan-avatars.js
 */

const fs = require('fs');
const path = require('path');

const ASSETS_PATH = path.join(__dirname, '../src/assets/learner_icons');
const BOY_PATH = path.join(ASSETS_PATH, 'boy');
const GIRL_PATH = path.join(ASSETS_PATH, 'girl');
const SERVICE_PATH = path.join(__dirname, '../src/app/services/avatar.service.ts');

function scanDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.warn(`Directory not found: ${dirPath}`);
      return [];
    }
    
    return fs.readdirSync(dirPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
      })
      .sort();
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
    return [];
  }
}

function generateAvatarList(avatars, indent = '    ') {
  return avatars.map(avatar => `${indent}'${avatar}'`).join(',\n');
}

function updateAvatarService() {
  try {
    // Scan directories
    const boyAvatars = scanDirectory(BOY_PATH);
    const girlAvatars = scanDirectory(GIRL_PATH);
    
    console.log(`Found ${boyAvatars.length} boy avatars:`, boyAvatars);
    console.log(`Found ${girlAvatars.length} girl avatars:`, girlAvatars);
    
    // Read current service file
    const serviceContent = fs.readFileSync(SERVICE_PATH, 'utf8');
    
    // Generate new avatar lists
    const boyAvatarsList = generateAvatarList(boyAvatars);
    const girlAvatarsList = generateAvatarList(girlAvatars);
    
    // Replace the avatar lists in the service
    const updatedContent = serviceContent
      .replace(
        /private readonly boyAvatarsList = \[[\\s\\S]*?\];/,
        `private readonly boyAvatarsList = [\n${boyAvatarsList}\n    // Add new boy avatars here - they will be automatically detected\n  ];`
      )
      .replace(
        /private readonly girlAvatarsList = \[[\\s\\S]*?\];/,
        `private readonly girlAvatarsList = [\n${girlAvatarsList}\n    // Add new girl avatars here - they will be automatically detected\n  ];`
      );
    
    // Write updated service file
    fs.writeFileSync(SERVICE_PATH, updatedContent, 'utf8');
    
    console.log('✅ Avatar service updated successfully!');
    console.log(`📁 Boy avatars: ${boyAvatars.length}`);
    console.log(`👧 Girl avatars: ${girlAvatars.length}`);
    
  } catch (error) {
    console.error('❌ Error updating avatar service:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🔍 Scanning avatar directories...');
  console.log(`Boy avatars path: ${BOY_PATH}`);
  console.log(`Girl avatars path: ${GIRL_PATH}`);
  console.log('');
  
  updateAvatarService();
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, updateAvatarService };