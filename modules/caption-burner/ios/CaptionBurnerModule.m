#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CaptionBurnerModule, NSObject)

RCT_EXTERN_METHOD(burnCaptionsIntoVideo:(NSString *)inputPath
                  captionSegmentsJSON:(NSString *)captionSegmentsJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end

