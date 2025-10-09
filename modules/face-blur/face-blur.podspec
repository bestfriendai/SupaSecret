require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'face-blur'
  s.version        = package['version']
  s.summary        = 'Native face blur module'
  s.description    = 'Native face blur using Vision Framework and ML Kit'
  s.license        = { :type => 'MIT' }
  s.authors        = package['author'] || 'Toxic Confessions'
  s.homepage       = 'https://github.com'
  s.platform       = :ios, '16.0'
  s.swift_version  = '5.4'
  s.source         = { :git => 'https://github.com', :tag => "v#{s.version}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
end
