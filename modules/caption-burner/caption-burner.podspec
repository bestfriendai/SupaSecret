require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'caption-burner'
  s.version        = package['version']
  s.summary        = 'Native iOS caption burning module for React Native'
  s.description    = 'Burns captions into videos using AVFoundation with TikTok-style animations'
  s.license        = 'MIT'
  s.author         = { 'Toxic Confessions' => 'support@toxicconfessions.app' }
  s.homepage       = 'https://toxicconfessions.app'
  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'
  s.source         = { git: '', tag: s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

