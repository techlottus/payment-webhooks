import { Controller, Post, Req, Res } from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';

@Controller('events')
export class EventsController {
  constructor(private utilsService: UtilsService) {}
  @Post('/created')
  async created(@Req() req, @Res() response: any) {
    if (req.body.model === 'event') {
      const strapiReq = {
        event_id: req.body.entry.id,
        event_name: req.body.entry.name,
        metadata: req.body.entry.metadata,
        start_register: req.body.entry.register_start_datetime,
        end_register: req.body.entry.register_end_datetime,
      }
      console.log('strapiReq: ', strapiReq);
      const trackEventsObs = this.utilsService.postStrapi('track-events?populate=*', strapiReq)

      trackEventsObs.pipe(
        mergeMap((trackEventsRes: any) => {
          console.log('trackEventsRes: ', trackEventsRes);
          return this.utilsService.putStrapiPortalverse('events', { attendat_list: trackEventsRes.data.data.id }, req.body.entry.id)
        })
      ).subscribe((res) => {
        console.log('res: ', res);
      })

      response.status(200).send('created');
      return 'created';
    } else {
      response.status(200).send();
    }
  }
}



//  entry: {
//   id: 1,
//   name: null,
//   start_datetime: null,
//   end_datetime: null,
//   text_location: null,
//   short_description: null,
//   description: null,
//   details: null,
//   modality: null,
//   slug: null,
//   breadcrumb: null,
//   total_duration: null,
//   attendant_list: null,
//   status: null,
//   is_private: null,
//   register_start_datetime: null,
//   register_end_datetime: null,
//   createdAt: '2025-02-13T20:15:25.320Z',
//   updatedAt: '2025-02-13T20:15:25.320Z',
//   publishedAt: null,
//   location: null,
//   expositor: null,
//   desktop_image: null,
//   tablet_image: null,
//   mobile_image: null,
//   price_list: null,
//   category: null,
//   campus: null,
//   seo: null,
//   sponsors: [],
//   agenda: null,
//   contact_link: null,
//   video: null
// }